import { randomUUID } from 'node:crypto';
import {
  db,
  company,
  companyContact,
  companyAttachment,
  initiative,
  issue,
  project,
  projectMember,
  team,
  projectColumn,
  user,
  teamMember,
  workspaceManager,
} from '@repo/db';
import { and, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { putObject, deleteObject } from '@repo/storage';
import { HttpError, iso, num } from '#shared/lib';
import { projectRef } from '#modules/teams/ref';
import { workspaceGrants } from '#modules/workspaces/service';
import { COMPANY_CODE_MAX_LENGTH, normalizeCompanyCode, suggestCompanyCode } from './code';

export interface CompanyUserSummaryDto {
  id: string;
  name: string | null;
  email: string;
}

export interface CompanyStatsDto {
  projectCount: number;
  initiativeCount: number;
  totalIssues: number;
  openIssues: number;
  completedIssues: number;
  overdueIssues: number;
  lastActivityAt: string | null;
}

export interface CompanySummary {
  id: number;
  teamId: number | null;
  ownerUserId: string | null;
  createdByUserId: string | null;
  owner?: CompanyUserSummaryDto | null;
  taxId: string;
  code: string | null;
  name: string;
  tradeName: string | null;
  status: string;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  blacklistedAt: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: CompanyStatsDto;
}

export interface CompanyProjectItemDto {
  id: number;
  key: string;
  ref: string;
  name: string;
  description: string;
  teamId: number;
  teamName: string;
  archivedAt: string | null;
  totalIssues: number;
  openIssues: number;
  completedIssues: number;
  overdueIssues: number;
  lastActivityAt: string | null;
}

export interface CompanyInitiativeItemDto {
  id: number;
  title: string;
  status: string;
  targetDate: string | null;
  projectId: number;
  projectKey: string;
  projectRef: string;
  projectName: string;
  totalIssues: number;
  completedIssues: number;
  inherited: boolean;
}

export interface CompanyContactDto {
  id: number;
  companyId: number;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  isLegalRepresentative: boolean;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyAttachmentDto {
  id: number;
  companyId: number;
  publicId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  documentType: string | null;
  year: number | null;
  createdAt: string;
}

export interface CompanyDetail extends CompanySummary {
  blacklistedByUserId: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  contacts: CompanyContactDto[];
  attachments: CompanyAttachmentDto[];
}

async function getTeamWorkspaceId(teamId: number): Promise<number | null> {
  const [row] = await db
    .select({ workspaceId: team.workspaceId })
    .from(team)
    .where(eq(team.id, teamId));
  return row?.workspaceId ?? null;
}

async function isManagerInWorkspace(userId: string, workspaceId: number): Promise<boolean> {
  const [wsAdmin] = await db
    .select({ role: workspaceManager.role })
    .from(workspaceManager)
    .where(and(eq(workspaceManager.workspaceId, workspaceId), eq(workspaceManager.userId, userId)));
  if (wsAdmin) return true;

  const [tm] = await db
    .select({ role: teamMember.role })
    .from(teamMember)
    .innerJoin(team, eq(team.id, teamMember.teamId))
    .where(
      and(
        eq(team.workspaceId, workspaceId),
        eq(teamMember.userId, userId),
        or(eq(teamMember.role, 'owner'), eq(teamMember.role, 'manager')),
      ),
    )
    .limit(1);
  return Boolean(tm);
}

export async function isCompanyManager(
  userId: string,
  teamId?: number | null,
  companyId?: number | null,
): Promise<boolean> {
  const [userRow] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  if (userRow?.role === 'god') return true;

  let resolvedTeamId = teamId ?? null;
  if (resolvedTeamId == null && companyId != null) {
    const [comp] = await db
      .select({ teamId: company.teamId })
      .from(company)
      .where(eq(company.id, companyId));
    resolvedTeamId = comp?.teamId ?? null;
  }

  if (resolvedTeamId != null) {
    const workspaceId = await getTeamWorkspaceId(resolvedTeamId);
    if (workspaceId == null) return false;
    return isManagerInWorkspace(userId, workspaceId);
  }

  // Without a team context, only global god users are managers so a user's personal
  // workspace/team ownership never grants manager access over other reps' companies.
  return false;
}

async function accessibleProjectIds(userId: string): Promise<number[]> {
  const [memberRows, grants] = await Promise.all([
    db
      .select({ projectId: projectMember.projectId })
      .from(projectMember)
      .where(eq(projectMember.userId, userId)),
    workspaceGrants(userId),
  ]);
  const ids = new Set(memberRows.map((r) => r.projectId));
  const grantedTeams = [...grants.keys()];
  if (grantedTeams.length > 0) {
    const teamProjects = await db
      .select({ id: project.id })
      .from(project)
      .where(inArray(project.teamId, grantedTeams));
    for (const p of teamProjects) ids.add(p.id);
  }
  return [...ids];
}

async function hasProjectLinkedCompanyReadAccess(
  companyId: number,
  userId: string,
): Promise<boolean> {
  const projectIds = await accessibleProjectIds(userId);
  if (projectIds.length === 0) return false;
  const [directProject] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(inArray(project.id, projectIds), eq(project.companyId, companyId)))
    .limit(1);
  if (directProject) return true;

  const [directInitiative] = await db
    .select({ id: initiative.id })
    .from(initiative)
    .where(and(inArray(initiative.projectId, projectIds), eq(initiative.companyId, companyId)))
    .limit(1);
  if (directInitiative) return true;

  const [directIssue] = await db
    .select({ id: issue.id })
    .from(issue)
    .where(and(inArray(issue.projectId, projectIds), eq(issue.companyId, companyId)))
    .limit(1);
  return Boolean(directIssue);
}

function isCompanyOwner(
  comp: { ownerUserId: string | null; createdByUserId: string | null },
  userId: string,
): boolean {
  return comp.ownerUserId === userId || (!comp.ownerUserId && comp.createdByUserId === userId);
}

async function requireCompanyReadAccess(
  companyId: number,
  userId: string,
  isManager: boolean,
): Promise<typeof company.$inferSelect> {
  const [comp] = await db.select().from(company).where(eq(company.id, companyId));
  if (!comp) throw new HttpError(404, 'Company not found');
  if (isManager || isCompanyOwner(comp, userId)) return comp;
  if (await hasProjectLinkedCompanyReadAccess(companyId, userId)) return comp;
  throw new HttpError(403, 'No tienes permiso para ver esta empresa (pertenece a otro ejecutivo)');
}

export async function assertCompanyAssignable(
  companyId: number | null | undefined,
  userId: string,
  teamId?: number | null,
): Promise<void> {
  if (companyId == null) return;
  const [comp] = await db.select().from(company).where(eq(company.id, companyId));
  if (!comp) throw new HttpError(400, 'Company not found');
  if (await isCompanyManager(userId, teamId ?? comp.teamId, companyId)) return;
  if (isCompanyOwner(comp, userId)) return;
  if (await hasProjectLinkedCompanyReadAccess(companyId, userId)) return;
  throw new HttpError(403, 'No tienes permiso para vincular esta empresa');
}

function mapContact(row: typeof companyContact.$inferSelect): CompanyContactDto {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    isPrimary: row.isPrimary,
    isLegalRepresentative: row.isLegalRepresentative,
    documentId: row.documentId,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function mapAttachment(row: typeof companyAttachment.$inferSelect): CompanyAttachmentDto {
  return {
    id: row.id,
    companyId: row.companyId,
    publicId: row.publicId,
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: num(row.sizeBytes),
    url: `/media/company-attachments/${row.publicId}/raw`,
    documentType: row.documentType,
    year: row.year,
    createdAt: iso(row.createdAt),
  };
}

async function requireCompanyAccess(
  companyId: number,
  userId: string,
  isManager: boolean,
): Promise<typeof company.$inferSelect> {
  const [comp] = await db.select().from(company).where(eq(company.id, companyId));
  if (!comp) throw new HttpError(404, 'Company not found');

  if (!isManager) {
    const isOwner =
      comp.ownerUserId === userId || (!comp.ownerUserId && comp.createdByUserId === userId);
    if (!isOwner) {
      throw new HttpError(403, 'No tienes permiso para gestionar esta empresa');
    }
  }

  return comp;
}

const EMPTY_COMPANY_STATS: CompanyStatsDto = {
  projectCount: 0,
  initiativeCount: 0,
  totalIssues: 0,
  openIssues: 0,
  completedIssues: 0,
  overdueIssues: 0,
  lastActivityAt: null,
};

async function computeCompanyStats(
  companyIds: number[],
  userId: string,
): Promise<Map<number, CompanyStatsDto>> {
  const out = new Map<number, CompanyStatsDto>();
  if (companyIds.length === 0) return out;
  const projectIds = await accessibleProjectIds(userId);
  if (projectIds.length === 0) return out;

  const ensure = (cid: number) => {
    let entry = out.get(cid);
    if (!entry) {
      entry = { ...EMPTY_COMPANY_STATS };
      out.set(cid, entry);
    }
    return entry;
  };

  const today = new Date().toISOString().slice(0, 10);
  const effectiveCompanyId = sql<
    number | null
  >`COALESCE(${issue.companyId}, ${initiative.companyId}, ${project.companyId})`;

  const [projCounts, initCounts, issueAggs] = await Promise.all([
    db
      .select({
        companyId: project.companyId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(project)
      .where(
        and(
          inArray(project.id, projectIds),
          inArray(project.companyId, companyIds),
          isNull(project.archivedAt),
        ),
      )
      .groupBy(project.companyId),
    db
      .select({
        companyId: sql<number>`COALESCE(${initiative.companyId}, ${project.companyId})`,
        cnt: sql<number>`count(*)::int`,
      })
      .from(initiative)
      .innerJoin(project, eq(project.id, initiative.projectId))
      .where(
        and(
          inArray(initiative.projectId, projectIds),
          isNull(project.archivedAt),
          sql`COALESCE(${initiative.companyId}, ${project.companyId}) IN (${sql.join(
            companyIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        ),
      )
      .groupBy(sql`COALESCE(${initiative.companyId}, ${project.companyId})`),
    db
      .select({
        companyId: effectiveCompanyId,
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${projectColumn.stateType} not in ('completed', 'canceled'))::int`,
        completed: sql<number>`count(*) filter (where ${projectColumn.stateType} = 'completed')::int`,
        overdue: sql<number>`count(*) filter (where ${projectColumn.stateType} not in ('completed', 'canceled') and ${issue.dueDate} is not null and ${issue.dueDate} < ${today})::int`,
        lastActivityAt: sql<Date | null>`max(${issue.updatedAt})`,
      })
      .from(issue)
      .innerJoin(project, eq(project.id, issue.projectId))
      .innerJoin(projectColumn, eq(projectColumn.id, issue.columnId))
      .leftJoin(initiative, eq(initiative.id, issue.initiativeId))
      .where(
        and(
          inArray(issue.projectId, projectIds),
          isNull(project.archivedAt),
          isNull(issue.archivedAt),
          sql`${effectiveCompanyId} IN (${sql.join(
            companyIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        ),
      )
      .groupBy(effectiveCompanyId),
  ]);

  for (const r of projCounts) {
    if (r.companyId != null) ensure(r.companyId).projectCount = Number(r.cnt);
  }
  for (const r of initCounts) {
    if (r.companyId != null) ensure(r.companyId).initiativeCount = Number(r.cnt);
  }
  for (const r of issueAggs) {
    if (r.companyId == null) continue;
    const entry = ensure(Number(r.companyId));
    entry.totalIssues = Number(r.total);
    entry.openIssues = Number(r.open);
    entry.completedIssues = Number(r.completed);
    entry.overdueIssues = Number(r.overdue);
    entry.lastActivityAt = r.lastActivityAt ? iso(new Date(r.lastActivityAt)) : null;
  }

  return out;
}

export async function listCompanies(params: {
  query?: string;
  isBlacklisted?: boolean;
  filter?: 'mine' | 'all';
  teamId?: number;
  ownerUserId?: string;
  userId: string;
  isManager: boolean;
}): Promise<CompanySummary[]> {
  const conditions = [];

  if (params.query) {
    conditions.push(
      or(
        ilike(company.taxId, `%${params.query}%`),
        ilike(company.code, `%${params.query}%`),
        ilike(company.name, `%${params.query}%`),
        ilike(company.tradeName, `%${params.query}%`),
      ),
    );
  }

  if (params.isBlacklisted !== undefined) {
    conditions.push(eq(company.isBlacklisted, params.isBlacklisted));
  }

  if (params.teamId !== undefined) {
    const workspaceId = await getTeamWorkspaceId(params.teamId);
    if (workspaceId != null) {
      const wsTeams = await db
        .select({ id: team.id })
        .from(team)
        .where(eq(team.workspaceId, workspaceId));
      const wsTeamIds = wsTeams.map((t) => t.id);
      if (wsTeamIds.length > 0) {
        conditions.push(or(inArray(company.teamId, wsTeamIds), isNull(company.teamId)));
      }
    }
  }

  if (params.isManager && params.ownerUserId) {
    conditions.push(eq(company.ownerUserId, params.ownerUserId));
  } else if (!params.isManager || params.filter === 'mine') {
    conditions.push(
      or(
        eq(company.ownerUserId, params.userId),
        and(isNull(company.ownerUserId), eq(company.createdByUserId, params.userId)),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      company,
      owner: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(company)
    .leftJoin(user, eq(company.ownerUserId, user.id))
    .where(where)
    .orderBy(desc(company.createdAt))
    .limit(100);

  const statsMap = await computeCompanyStats(
    rows.map(({ company: r }) => r.id),
    params.userId,
  );

  return rows.map(({ company: r, owner }) => ({
    id: r.id,
    teamId: r.teamId,
    ownerUserId: r.ownerUserId,
    createdByUserId: r.createdByUserId,
    owner:
      r.ownerUserId && owner?.id ? { id: owner.id, name: owner.name, email: owner.email } : null,
    taxId: r.taxId,
    code: r.code,
    name: r.name,
    tradeName: r.tradeName,
    status: r.status,
    isBlacklisted: r.isBlacklisted,
    blacklistReason: r.blacklistReason,
    blacklistedAt: r.blacklistedAt ? iso(r.blacklistedAt) : null,
    email: r.email,
    phone: r.phone,
    city: r.city,
    country: r.country,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
    stats: statsMap.get(r.id) ?? { ...EMPTY_COMPANY_STATS },
  }));
}

export async function getCompanyById(
  id: number,
  userId?: string,
  isManager?: boolean,
): Promise<CompanyDetail | null> {
  const [row] = await db
    .select({
      company,
      owner: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(company)
    .leftJoin(user, eq(company.ownerUserId, user.id))
    .where(eq(company.id, id));

  if (!row) return null;
  const { company: r, owner } = row;

  if (userId && !isManager) {
    const isOwner = r.ownerUserId === userId || (!r.ownerUserId && r.createdByUserId === userId);
    if (!isOwner && !(await hasProjectLinkedCompanyReadAccess(id, userId))) {
      throw new HttpError(
        403,
        'No tienes permiso para ver esta empresa (pertenece a otro ejecutivo)',
      );
    }
  }

  const contacts = await db
    .select()
    .from(companyContact)
    .where(eq(companyContact.companyId, id))
    .orderBy(desc(companyContact.isPrimary), companyContact.name);

  const attachments = await db
    .select()
    .from(companyAttachment)
    .where(eq(companyAttachment.companyId, id))
    .orderBy(desc(companyAttachment.createdAt));

  return {
    id: r.id,
    teamId: r.teamId,
    ownerUserId: r.ownerUserId,
    createdByUserId: r.createdByUserId,
    owner:
      r.ownerUserId && owner?.id ? { id: owner.id, name: owner.name, email: owner.email } : null,
    taxId: r.taxId,
    code: r.code,
    name: r.name,
    tradeName: r.tradeName,
    status: r.status,
    isBlacklisted: r.isBlacklisted,
    blacklistReason: r.blacklistReason,
    blacklistedAt: r.blacklistedAt ? iso(r.blacklistedAt) : null,
    blacklistedByUserId: r.blacklistedByUserId,
    email: r.email,
    phone: r.phone,
    address: r.address,
    city: r.city,
    country: r.country,
    website: r.website,
    notes: r.notes,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
    contacts: contacts.map(mapContact),
    attachments: attachments.map(mapAttachment),
  };
}

export async function getCompanyByTaxId(
  taxId: string,
  userId?: string,
  isManager?: boolean,
): Promise<CompanyDetail | null> {
  const [row] = await db.select().from(company).where(eq(company.taxId, taxId));
  if (!row) return null;
  return getCompanyById(row.id, userId, isManager);
}

async function resolveUniqueCompanyCode(
  requested: string | undefined,
  name: string,
  tradeName?: string,
  excludeId?: number,
): Promise<string> {
  const isTaken = async (candidate: string) => {
    const cond =
      excludeId !== undefined
        ? and(eq(company.code, candidate), ne(company.id, excludeId))
        : eq(company.code, candidate);
    const [row] = await db.select({ id: company.id }).from(company).where(cond);
    return Boolean(row);
  };

  if (requested !== undefined && requested.trim() !== '') {
    const normalized = normalizeCompanyCode(requested);
    if (!normalized) {
      throw new HttpError(400, 'Código de empresa inválido');
    }
    if (await isTaken(normalized)) {
      throw new HttpError(409, `El código de empresa ${normalized} ya está en uso`);
    }
    return normalized;
  }

  const base = suggestCompanyCode(name, tradeName) || 'EMP';
  if (!(await isTaken(base))) return base;

  for (let i = 2; i < 1000; i += 1) {
    const suffix = String(i);
    const candidate = `${base.slice(0, COMPANY_CODE_MAX_LENGTH - suffix.length)}${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new HttpError(409, 'No se pudo generar un código único para la empresa');
}

export async function createCompany(data: {
  taxId: string;
  code?: string;
  name: string;
  tradeName?: string;
  status?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  notes?: string;
  teamId?: number;
  ownerUserId?: string;
  userId: string;
  isManager: boolean;
}): Promise<CompanyDetail> {
  const cleanTaxId = data.taxId.trim();

  const [existing] = await db
    .select({
      id: company.id,
      name: company.name,
      isBlacklisted: company.isBlacklisted,
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(company)
    .leftJoin(user, eq(company.ownerUserId, user.id))
    .where(eq(company.taxId, cleanTaxId));

  if (existing) {
    const ownerLabel = existing.ownerName || existing.ownerEmail || 'otro ejecutivo';
    const blacklistNote = existing.isBlacklisted ? ' (en lista negra)' : '';
    throw new HttpError(
      409,
      `Esta empresa ya está registrada en la cartera de ${ownerLabel}${blacklistNote}`,
    );
  }

  const assignedOwnerId = data.isManager && data.ownerUserId ? data.ownerUserId : data.userId;
  const resolvedCode = await resolveUniqueCompanyCode(data.code, data.name, data.tradeName);

  const [created] = await db
    .insert(company)
    .values({
      taxId: cleanTaxId,
      code: resolvedCode,
      name: data.name.trim(),
      tradeName: data.tradeName?.trim(),
      status: data.status ?? 'active',
      email: data.email?.trim(),
      phone: data.phone?.trim(),
      address: data.address?.trim(),
      city: data.city?.trim(),
      country: data.country?.trim() ?? 'PE',
      website: data.website?.trim(),
      notes: data.notes?.trim(),
      teamId: data.teamId,
      ownerUserId: assignedOwnerId,
      createdByUserId: data.userId,
    })
    .returning();

  return (await getCompanyById(created.id, data.userId, true))!;
}

export async function updateCompany(
  id: number,
  data: Partial<{
    taxId: string;
    code?: string;
    name: string;
    tradeName?: string;
    status?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
    notes?: string;
    teamId?: number;
    ownerUserId?: string;
  }>,
  userId: string,
  isManager: boolean,
): Promise<CompanyDetail> {
  const current = await requireCompanyAccess(id, userId, isManager);

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.taxId !== undefined) updateValues.taxId = data.taxId.trim();
  if (data.code !== undefined) {
    updateValues.code = await resolveUniqueCompanyCode(
      data.code,
      data.name ?? current.name,
      data.tradeName ?? current.tradeName ?? undefined,
      id,
    );
  }
  if (data.name !== undefined) updateValues.name = data.name.trim();
  if (data.tradeName !== undefined) updateValues.tradeName = data.tradeName?.trim() || null;
  if (data.status !== undefined) updateValues.status = data.status;
  if (data.email !== undefined) updateValues.email = data.email?.trim() || null;
  if (data.phone !== undefined) updateValues.phone = data.phone?.trim() || null;
  if (data.address !== undefined) updateValues.address = data.address?.trim() || null;
  if (data.city !== undefined) updateValues.city = data.city?.trim() || null;
  if (data.country !== undefined) updateValues.country = data.country?.trim() || 'PE';
  if (data.website !== undefined) updateValues.website = data.website?.trim() || null;
  if (data.notes !== undefined) updateValues.notes = data.notes?.trim() || null;

  if (isManager) {
    if (data.teamId !== undefined) updateValues.teamId = data.teamId;
    if (data.ownerUserId !== undefined) updateValues.ownerUserId = data.ownerUserId;
  }

  await db.update(company).set(updateValues).where(eq(company.id, id));
  return (await getCompanyById(id, userId, true))!;
}

export async function setCompanyBlacklist(
  id: number,
  isBlacklisted: boolean,
  reason: string | undefined,
  userId: string,
  isManager: boolean,
): Promise<CompanyDetail> {
  if (!isManager) {
    throw new HttpError(403, 'Solo administradores o managers pueden modificar la lista negra');
  }

  const [updated] = await db
    .update(company)
    .set({
      isBlacklisted,
      blacklistReason: isBlacklisted ? reason?.trim() || 'Listed without specific reason' : null,
      blacklistedAt: isBlacklisted ? new Date() : null,
      blacklistedByUserId: isBlacklisted ? userId : null,
      updatedAt: new Date(),
    })
    .where(eq(company.id, id))
    .returning();

  if (!updated) throw new HttpError(404, 'Company not found');
  return (await getCompanyById(id, userId, true))!;
}

export async function deleteCompany(
  id: number,
  _userId: string,
  isManager: boolean,
): Promise<boolean> {
  if (!isManager) {
    throw new HttpError(403, 'Solo administradores o managers pueden eliminar empresas');
  }

  const [deleted] = await db.delete(company).where(eq(company.id, id)).returning();
  return Boolean(deleted);
}

export async function createContact(
  companyId: number,
  data: {
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
    isLegalRepresentative?: boolean;
    documentId?: string;
  },
  userId: string,
  isManager: boolean,
): Promise<CompanyContactDto> {
  await requireCompanyAccess(companyId, userId, isManager);

  const [created] = await db
    .insert(companyContact)
    .values({
      companyId,
      name: data.name.trim(),
      role: data.role?.trim(),
      email: data.email?.trim(),
      phone: data.phone?.trim(),
      isPrimary: data.isPrimary ?? false,
      isLegalRepresentative: data.isLegalRepresentative ?? false,
      documentId: data.documentId?.trim(),
    })
    .returning();

  return mapContact(created);
}

export async function updateContact(
  contactId: number,
  companyId: number,
  data: Partial<{
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
    isLegalRepresentative?: boolean;
    documentId?: string;
  }>,
  userId: string,
  isManager: boolean,
): Promise<CompanyContactDto | null> {
  await requireCompanyAccess(companyId, userId, isManager);

  const [updated] = await db
    .update(companyContact)
    .set({
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.role !== undefined ? { role: data.role?.trim() } : {}),
      ...(data.email !== undefined ? { email: data.email?.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone?.trim() } : {}),
      ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
      ...(data.isLegalRepresentative !== undefined
        ? { isLegalRepresentative: data.isLegalRepresentative }
        : {}),
      ...(data.documentId !== undefined ? { documentId: data.documentId?.trim() } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(companyContact.id, contactId), eq(companyContact.companyId, companyId)))
    .returning();

  if (!updated) return null;
  return mapContact(updated);
}

export async function deleteContact(
  contactId: number,
  companyId: number,
  userId: string,
  isManager: boolean,
): Promise<boolean> {
  await requireCompanyAccess(companyId, userId, isManager);

  const [deleted] = await db
    .delete(companyContact)
    .where(and(eq(companyContact.id, contactId), eq(companyContact.companyId, companyId)))
    .returning();
  return Boolean(deleted);
}

export async function createCompanyAttachment(
  companyId: number,
  file: File,
  userId: string,
  isManager: boolean,
  documentType?: string,
  year?: number,
): Promise<CompanyAttachmentDto> {
  await requireCompanyAccess(companyId, userId, isManager);

  const publicId = randomUUID();
  const s3Key = `company-attachments/${companyId}/${publicId}-${file.name}`;
  const buffer = await file.arrayBuffer();

  await putObject(s3Key, Buffer.from(buffer), file.type || 'application/octet-stream');

  const [row] = await db
    .insert(companyAttachment)
    .values({
      companyId,
      publicId,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      s3Key,
      documentType: documentType?.trim(),
      year: year ?? new Date().getFullYear(),
    })
    .returning();

  return mapAttachment(row);
}

export async function deleteCompanyAttachment(
  attachmentId: number,
  companyId: number,
  userId: string,
  isManager: boolean,
): Promise<boolean> {
  await requireCompanyAccess(companyId, userId, isManager);

  const [row] = await db
    .select()
    .from(companyAttachment)
    .where(and(eq(companyAttachment.id, attachmentId), eq(companyAttachment.companyId, companyId)));

  if (!row) return false;

  try {
    await deleteObject(row.s3Key);
  } catch {
    // Ignore storage deletion errors if file is already missing
  }

  await db.delete(companyAttachment).where(eq(companyAttachment.id, attachmentId));
  return true;
}

export async function getCompanyActivities(companyId: number, userId: string, isManager: boolean) {
  await requireCompanyReadAccess(companyId, userId, isManager);
  const projectIds = await accessibleProjectIds(userId);
  if (projectIds.length === 0) return [];

  const effectiveCompanyId = sql<
    number | null
  >`COALESCE(${issue.companyId}, ${initiative.companyId}, ${project.companyId})`;

  const rows = await db
    .select({
      id: issue.id,
      sequenceNumber: issue.sequenceNumber,
      title: issue.title,
      projectId: project.id,
      projectKey: project.key,
      teamId: team.id,
      teamSlug: team.slug,
      projectName: project.name,
      teamKey: team.name,
      columnName: projectColumn.name,
      columnStateType: projectColumn.stateType,
      dueDate: issue.dueDate,
      directCompanyId: issue.companyId,
      createdAt: issue.createdAt,
    })
    .from(issue)
    .innerJoin(project, eq(issue.projectId, project.id))
    .innerJoin(team, eq(project.teamId, team.id))
    .innerJoin(projectColumn, eq(issue.columnId, projectColumn.id))
    .leftJoin(initiative, eq(initiative.id, issue.initiativeId))
    .where(
      and(
        inArray(issue.projectId, projectIds),
        isNull(issue.archivedAt),
        eq(effectiveCompanyId, companyId),
      ),
    )
    .orderBy(desc(issue.createdAt));

  return rows.map((r) => ({
    id: r.id,
    sequenceNumber: r.sequenceNumber,
    title: r.title,
    projectId: r.projectId,
    projectKey: r.projectKey,
    projectRef: projectRef({ id: r.teamId, slug: r.teamSlug }, r.projectKey),
    projectName: r.projectName,
    teamKey: r.teamKey,
    columnName: r.columnName,
    columnStateType: r.columnStateType,
    dueDate: r.dueDate,
    inherited: r.directCompanyId == null,
    createdAt: iso(r.createdAt),
  }));
}

export async function getCompanyProjects(
  companyId: number,
  userId: string,
  isManager: boolean,
): Promise<CompanyProjectItemDto[]> {
  await requireCompanyReadAccess(companyId, userId, isManager);
  const projectIds = await accessibleProjectIds(userId);
  if (projectIds.length === 0) return [];

  const rows = await db
    .select({
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      teamId: project.teamId,
      teamName: team.name,
      teamSlug: team.slug,
      archivedAt: project.archivedAt,
    })
    .from(project)
    .innerJoin(team, eq(team.id, project.teamId))
    .where(and(inArray(project.id, projectIds), eq(project.companyId, companyId)))
    .orderBy(desc(project.createdAt));

  if (rows.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const matchedIds = rows.map((r) => r.id);
  const statsRows = await db
    .select({
      projectId: issue.projectId,
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${projectColumn.stateType} not in ('completed', 'canceled'))::int`,
      completed: sql<number>`count(*) filter (where ${projectColumn.stateType} = 'completed')::int`,
      overdue: sql<number>`count(*) filter (where ${projectColumn.stateType} not in ('completed', 'canceled') and ${issue.dueDate} is not null and ${issue.dueDate} < ${today})::int`,
      lastActivityAt: sql<Date | null>`max(${issue.updatedAt})`,
    })
    .from(issue)
    .innerJoin(projectColumn, eq(projectColumn.id, issue.columnId))
    .where(and(inArray(issue.projectId, matchedIds), isNull(issue.archivedAt)))
    .groupBy(issue.projectId);

  const statsByProject = new Map(statsRows.map((s) => [s.projectId, s]));

  return rows.map((r) => {
    const s = statsByProject.get(r.id);
    return {
      id: r.id,
      key: r.key,
      ref: projectRef({ id: r.teamId, slug: r.teamSlug }, r.key),
      name: r.name,
      description: r.description,
      teamId: r.teamId,
      teamName: r.teamName,
      archivedAt: r.archivedAt ? iso(r.archivedAt) : null,
      totalIssues: Number(s?.total ?? 0),
      openIssues: Number(s?.open ?? 0),
      completedIssues: Number(s?.completed ?? 0),
      overdueIssues: Number(s?.overdue ?? 0),
      lastActivityAt: s?.lastActivityAt ? iso(new Date(s.lastActivityAt)) : null,
    };
  });
}

export async function getCompanyInitiatives(
  companyId: number,
  userId: string,
  isManager: boolean,
): Promise<CompanyInitiativeItemDto[]> {
  await requireCompanyReadAccess(companyId, userId, isManager);
  const projectIds = await accessibleProjectIds(userId);
  if (projectIds.length === 0) return [];

  const effectiveCompanyId = sql<
    number | null
  >`COALESCE(${initiative.companyId}, ${project.companyId})`;

  const rows = await db
    .select({
      id: initiative.id,
      title: initiative.title,
      status: initiative.status,
      targetDate: initiative.targetDate,
      directCompanyId: initiative.companyId,
      projectId: project.id,
      projectKey: project.key,
      projectName: project.name,
      teamId: team.id,
      teamSlug: team.slug,
    })
    .from(initiative)
    .innerJoin(project, eq(project.id, initiative.projectId))
    .innerJoin(team, eq(team.id, project.teamId))
    .where(
      and(
        inArray(initiative.projectId, projectIds),
        isNull(project.archivedAt),
        eq(effectiveCompanyId, companyId),
      ),
    )
    .orderBy(desc(initiative.createdAt));

  if (rows.length === 0) return [];

  const initIds = rows.map((r) => r.id);
  const counts = await db
    .select({
      initiativeId: issue.initiativeId,
      total: sql<number>`count(*) filter (where ${issue.archivedAt} is null or ${projectColumn.stateType} in ('completed', 'canceled'))::int`,
      completed: sql<number>`count(*) filter (where ${projectColumn.stateType} = 'completed')::int`,
    })
    .from(issue)
    .innerJoin(projectColumn, eq(projectColumn.id, issue.columnId))
    .where(inArray(issue.initiativeId, initIds))
    .groupBy(issue.initiativeId);

  const countsByInit = new Map(
    counts
      .filter((c) => c.initiativeId != null)
      .map((c) => [c.initiativeId!, { total: Number(c.total), completed: Number(c.completed) }]),
  );

  return rows.map((r) => {
    const c = countsByInit.get(r.id);
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      targetDate: r.targetDate,
      projectId: r.projectId,
      projectKey: r.projectKey,
      projectRef: projectRef({ id: r.teamId, slug: r.teamSlug }, r.projectKey),
      projectName: r.projectName,
      totalIssues: c?.total ?? 0,
      completedIssues: c?.completed ?? 0,
      inherited: r.directCompanyId == null,
    };
  });
}

export interface SunatData {
  taxId: string;
  name: string;
  status: string;
  condition: string | null;
  address: string | null;
  department: string | null;
  province: string | null;
  district: string | null;
}

export async function lookupSunatRuc(taxId: string): Promise<SunatData | null> {
  const cleanTaxId = taxId.trim();
  if (!/^\d{11}$/.test(cleanTaxId)) return null;

  try {
    const res = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${cleanTaxId}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      nombre?: string;
      estado?: string;
      condicion?: string;
      direccion?: string;
      departamento?: string;
      provincia?: string;
      district?: string;
      distrito?: string;
      numeroDocumento?: string;
    };

    if (!data.nombre) return null;

    return {
      taxId: data.numeroDocumento || cleanTaxId,
      name: data.nombre,
      status: data.estado || 'ACTIVO',
      condition: data.condicion || null,
      address: data.direccion?.trim() || null,
      department: data.departamento || null,
      province: data.provincia || null,
      district: data.distrito || data.district || null,
    };
  } catch {
    return null;
  }
}

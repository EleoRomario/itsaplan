import { randomUUID } from 'node:crypto';
import {
  db,
  company,
  companyContact,
  companyAttachment,
  issue,
  project,
  team,
  projectColumn,
  user,
  teamMember,
} from '@repo/db';
import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { putObject, deleteObject } from '@repo/storage';
import { HttpError, iso, num } from '#shared/lib';

export interface CompanyUserSummaryDto {
  id: string;
  name: string | null;
  email: string;
}

export interface CompanySummary {
  id: number;
  teamId: number | null;
  ownerUserId: string | null;
  createdByUserId: string | null;
  owner?: CompanyUserSummaryDto | null;
  taxId: string;
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

export async function isCompanyManager(userId: string, teamId?: number | null): Promise<boolean> {
  const [userRow] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  if (userRow?.role === 'god') return true;

  if (teamId != null) {
    const [tm] = await db
      .select({ role: teamMember.role })
      .from(teamMember)
      .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)));
    return tm?.role === 'owner' || tm?.role === 'manager';
  }

  const tms = await db
    .select({ role: teamMember.role })
    .from(teamMember)
    .where(eq(teamMember.userId, userId));
  return tms.some((tm) => tm.role === 'owner' || tm.role === 'manager');
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

export async function listCompanies(params: {
  query?: string;
  isBlacklisted?: boolean;
  filter?: 'mine' | 'all';
  teamId?: number;
  userId: string;
  isManager: boolean;
}): Promise<CompanySummary[]> {
  const conditions = [];

  if (params.query) {
    conditions.push(
      or(
        ilike(company.taxId, `%${params.query}%`),
        ilike(company.name, `%${params.query}%`),
        ilike(company.tradeName, `%${params.query}%`),
      ),
    );
  }

  if (params.isBlacklisted !== undefined) {
    conditions.push(eq(company.isBlacklisted, params.isBlacklisted));
  }

  if (params.teamId !== undefined) {
    conditions.push(eq(company.teamId, params.teamId));
  }

  if (!params.isManager || params.filter === 'mine') {
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

  return rows.map(({ company: r, owner }) => ({
    id: r.id,
    teamId: r.teamId,
    ownerUserId: r.ownerUserId,
    createdByUserId: r.createdByUserId,
    owner:
      r.ownerUserId && owner?.id ? { id: owner.id, name: owner.name, email: owner.email } : null,
    taxId: r.taxId,
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
    if (!isOwner) {
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

export async function createCompany(data: {
  taxId: string;
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
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(company)
    .leftJoin(user, eq(company.ownerUserId, user.id))
    .where(eq(company.taxId, cleanTaxId));

  if (existing) {
    const ownerLabel = existing.ownerName || existing.ownerEmail || 'otro ejecutivo';
    throw new HttpError(409, `Esta empresa ya está registrada en la cartera de ${ownerLabel}`);
  }

  const assignedOwnerId = data.isManager && data.ownerUserId ? data.ownerUserId : data.userId;

  const [created] = await db
    .insert(company)
    .values({
      taxId: cleanTaxId,
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
  await requireCompanyAccess(id, userId, isManager);

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.taxId !== undefined) updateValues.taxId = data.taxId.trim();
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
  await requireCompanyAccess(companyId, userId, isManager);

  const rows = await db
    .select({
      id: issue.id,
      sequenceNumber: issue.sequenceNumber,
      title: issue.title,
      projectId: project.id,
      projectKey: project.key,
      projectName: project.name,
      teamKey: team.name,
      columnName: projectColumn.name,
      columnStateType: projectColumn.stateType,
      createdAt: issue.createdAt,
    })
    .from(issue)
    .innerJoin(project, eq(issue.projectId, project.id))
    .innerJoin(team, eq(project.teamId, team.id))
    .innerJoin(projectColumn, eq(issue.columnId, projectColumn.id))
    .where(eq(issue.companyId, companyId))
    .orderBy(desc(issue.createdAt));

  return rows.map((r) => ({
    ...r,
    createdAt: iso(r.createdAt),
  }));
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

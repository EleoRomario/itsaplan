import { randomBytes } from 'node:crypto';
import { db, project, projectColumn, projectForm, type FormQuestion } from '@repo/db';
import { and, asc, eq } from 'drizzle-orm';
import { HttpError } from '#shared/lib';
import { getProjectById } from '#modules/projects/service';
import { createIssue } from '#modules/issues/service';

export interface FormRow {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  slug: string;
  enabled: boolean;
  typeId: number | null;
  columnId: number | null;
  questions: FormQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormInput {
  title: string;
  description?: string;
  slug?: string;
  enabled?: boolean;
  typeId?: number | null;
  columnId?: number | null;
  questions?: FormQuestion[];
}

export type UpdateFormInput = Partial<CreateFormInput>;

export interface PublicFormView {
  title: string;
  description: string | null;
  slug: string;
  enabled: boolean;
  questions: FormQuestion[];
  project: {
    name: string;
    key: string;
  };
}

export interface SubmitPublicFormInput {
  name: string;
  email: string;
  title: string;
  description?: string;
  answers?: Record<string, unknown>;
}

function mapForm(row: typeof projectForm.$inferSelect): FormRow {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    slug: row.slug,
    enabled: row.enabled,
    typeId: row.typeId,
    columnId: row.columnId,
    questions: (row.questions as FormQuestion[]) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function generateSlug(title: string): string {
  const clean = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const prefix = clean ? clean.slice(0, 40) : 'form';
  const suffix = randomBytes(3).toString('hex');
  return `${prefix}-${suffix}`;
}

export async function listProjectForms(projectId: number): Promise<FormRow[]> {
  const rows = await db
    .select()
    .from(projectForm)
    .where(eq(projectForm.projectId, projectId))
    .orderBy(asc(projectForm.createdAt));
  return rows.map(mapForm);
}

export async function getProjectForm(projectId: number, formId: number): Promise<FormRow | null> {
  const [row] = await db
    .select()
    .from(projectForm)
    .where(and(eq(projectForm.projectId, projectId), eq(projectForm.id, formId)));
  return row ? mapForm(row) : null;
}

export async function createProjectForm(
  projectId: number,
  input: CreateFormInput,
): Promise<FormRow> {
  const slug = (input.slug?.trim() || generateSlug(input.title)).toLowerCase();
  const [row] = await db
    .insert(projectForm)
    .values({
      projectId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      slug,
      enabled: input.enabled ?? true,
      typeId: input.typeId ?? null,
      columnId: input.columnId ?? null,
      questions: input.questions ?? [],
    })
    .returning();
  return mapForm(row);
}

export async function updateProjectForm(
  projectId: number,
  formId: number,
  patch: UpdateFormInput,
): Promise<FormRow | null> {
  const updateData: Partial<typeof projectForm.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (patch.title !== undefined) updateData.title = patch.title.trim();
  if (patch.description !== undefined) updateData.description = patch.description?.trim() || null;
  if (patch.slug !== undefined) updateData.slug = patch.slug.trim().toLowerCase();
  if (patch.enabled !== undefined) updateData.enabled = patch.enabled;
  if (patch.typeId !== undefined) updateData.typeId = patch.typeId;
  if (patch.columnId !== undefined) updateData.columnId = patch.columnId;
  if (patch.questions !== undefined) updateData.questions = patch.questions;

  const [row] = await db
    .update(projectForm)
    .set(updateData)
    .where(and(eq(projectForm.projectId, projectId), eq(projectForm.id, formId)))
    .returning();

  return row ? mapForm(row) : null;
}

export async function deleteProjectForm(projectId: number, formId: number): Promise<boolean> {
  const [deleted] = await db
    .delete(projectForm)
    .where(and(eq(projectForm.projectId, projectId), eq(projectForm.id, formId)))
    .returning({ id: projectForm.id });
  return deleted != null;
}

export async function getPublicForm(slug: string): Promise<PublicFormView | null> {
  const [row] = await db
    .select({
      form: projectForm,
      projectName: project.name,
      projectKey: project.key,
    })
    .from(projectForm)
    .innerJoin(project, eq(projectForm.projectId, project.id))
    .where(eq(projectForm.slug, slug.toLowerCase()));

  if (!row) return null;

  return {
    title: row.form.title,
    description: row.form.description,
    slug: row.form.slug,
    enabled: row.form.enabled,
    questions: (row.form.questions as FormQuestion[]) ?? [],
    project: {
      name: row.projectName,
      key: row.projectKey,
    },
  };
}

export async function submitPublicForm(
  slug: string,
  submission: SubmitPublicFormInput,
): Promise<{ success: boolean; issueKey: string }> {
  const [row] = await db
    .select({
      form: projectForm,
      project,
    })
    .from(projectForm)
    .innerJoin(project, eq(projectForm.projectId, project.id))
    .where(eq(projectForm.slug, slug.toLowerCase()));

  if (!row || !row.form.enabled) {
    throw new HttpError(404, 'Form not found or disabled');
  }

  const projectRow = await getProjectById(row.project.id);
  if (!projectRow) {
    throw new HttpError(404, 'Project not found');
  }

  let targetColumnId = row.form.columnId;
  if (targetColumnId != null) {
    const [col] = await db
      .select({ id: projectColumn.id })
      .from(projectColumn)
      .where(and(eq(projectColumn.id, targetColumnId), eq(projectColumn.projectId, projectRow.id)));
    if (!col) targetColumnId = null;
  }

  if (targetColumnId == null) {
    const [firstCol] = await db
      .select({ id: projectColumn.id })
      .from(projectColumn)
      .where(eq(projectColumn.projectId, projectRow.id))
      .orderBy(asc(projectColumn.position))
      .limit(1);
    if (!firstCol) {
      throw new HttpError(400, 'Project has no workflow columns configured');
    }
    targetColumnId = firstCol.id;
  }

  const parts: string[] = [];
  parts.push(`**Submitted by:** ${submission.name} (${submission.email})`);

  if (submission.description?.trim()) {
    parts.push(submission.description.trim());
  }

  const questions = (row.form.questions as FormQuestion[]) ?? [];
  const answers = submission.answers ?? {};

  if (questions.length > 0 && Object.keys(answers).length > 0) {
    parts.push('### Additional Details');
    for (const q of questions) {
      const val = answers[q.id];
      if (val !== undefined && val !== null && val !== '') {
        const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
        parts.push(`**${q.label}:** ${displayVal}`);
      }
    }
  }

  const fullDescription = parts.join('\n\n');

  const createdIssue = await createIssue(
    projectRow,
    {
      title: submission.title.trim(),
      description: fullDescription,
      columnId: targetColumnId,
      typeId: row.form.typeId,
    },
    null,
  );

  return {
    success: true,
    issueKey: `${projectRow.key}-${createdIssue.sequenceNumber}`,
  };
}

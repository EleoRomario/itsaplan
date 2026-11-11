import { t } from 'elysia';

export const formParams = t.Object({ projectKey: t.String(), formId: t.Numeric() });
export const publicFormSlugParams = t.Object({ slug: t.String() });

export const formQuestionSchema = t.Object({
  id: t.String(),
  label: t.String({ minLength: 1 }),
  type: t.Union([t.Literal('text'), t.Literal('textarea'), t.Literal('select'), t.Literal('date')]),
  required: t.Boolean(),
  placeholder: t.Optional(t.String()),
  options: t.Optional(t.Array(t.String())),
});

export const ProjectFormResponse = t.Object({
  id: t.Number(),
  projectId: t.Number(),
  title: t.String(),
  description: t.Nullable(t.String()),
  slug: t.String(),
  enabled: t.Boolean(),
  typeId: t.Nullable(t.Number()),
  columnId: t.Nullable(t.Number()),
  questions: t.Array(formQuestionSchema),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const ProjectFormListResponse = t.Array(ProjectFormResponse);

export const createFormBody = t.Object({
  title: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String()),
  slug: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  enabled: t.Optional(t.Boolean()),
  typeId: t.Optional(t.Nullable(t.Integer())),
  columnId: t.Optional(t.Nullable(t.Integer())),
  questions: t.Optional(t.Array(formQuestionSchema)),
});

export const updateFormBody = t.Partial(createFormBody);

export const PublicFormResponse = t.Object({
  title: t.String(),
  description: t.Nullable(t.String()),
  slug: t.String(),
  enabled: t.Boolean(),
  questions: t.Array(formQuestionSchema),
  project: t.Object({
    name: t.String(),
    key: t.String(),
  }),
});

export const submitPublicFormBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  email: t.String({ minLength: 3, maxLength: 255 }),
  title: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String()),
  answers: t.Optional(t.Record(t.String(), t.Any())),
});

export const SubmitFormResponse = t.Object({
  success: t.Boolean(),
  issueKey: t.String(),
});

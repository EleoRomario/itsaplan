import { request } from '@/lib/api/core/client';

export type FormQuestionType = 'text' | 'textarea' | 'select' | 'date';

export interface FormQuestion {
  id: string;
  label: string;
  type: FormQuestionType;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface ProjectForm {
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

export interface NewProjectFormInput {
  title: string;
  description?: string;
  slug?: string;
  enabled?: boolean;
  typeId?: number | null;
  columnId?: number | null;
  questions?: FormQuestion[];
}

export type ProjectFormPatch = Partial<NewProjectFormInput>;

export interface PublicForm {
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

export interface SubmitPublicFormResponse {
  success: boolean;
  issueKey: string;
}

export const listProjectForms = (projectKey: string) =>
  request<ProjectForm[]>(`/projects/${projectKey}/forms`);

export const getProjectForm = (projectKey: string, formId: number) =>
  request<ProjectForm>(`/projects/${projectKey}/forms/${formId}`);

export const createProjectForm = (projectKey: string, input: NewProjectFormInput) =>
  request<ProjectForm>(`/projects/${projectKey}/forms`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateProjectForm = (projectKey: string, formId: number, patch: ProjectFormPatch) =>
  request<ProjectForm>(`/projects/${projectKey}/forms/${formId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const deleteProjectForm = (projectKey: string, formId: number) =>
  request<void>(`/projects/${projectKey}/forms/${formId}`, { method: 'DELETE' });

export const getPublicForm = (slug: string) => request<PublicForm>(`/public/forms/${slug}`);

export const submitPublicForm = (slug: string, input: SubmitPublicFormInput) =>
  request<SubmitPublicFormResponse>(`/public/forms/${slug}/submit`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

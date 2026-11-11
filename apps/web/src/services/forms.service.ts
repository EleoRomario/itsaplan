import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createProjectForm,
  deleteProjectForm,
  getPublicForm,
  listProjectForms,
  submitPublicForm,
  updateProjectForm,
  type NewProjectFormInput,
  type ProjectFormPatch,
  type SubmitPublicFormInput,
} from '@/lib/api/endpoints/forms';
import { qk } from '@/services/queryKeys';

export function useProjectFormsQuery(projectKey: string | null) {
  return useQuery({
    queryKey: qk.forms(projectKey ?? ''),
    queryFn: () => listProjectForms(projectKey!),
    enabled: projectKey != null,
  });
}

export function useCreateProjectForm(projectKey: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewProjectFormInput) => createProjectForm(projectKey!, input),
    onSuccess: () => {
      toast.success('Form created');
      if (projectKey) void qc.invalidateQueries({ queryKey: qk.forms(projectKey) });
    },
  });
}

export function useUpdateProjectForm(projectKey: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, patch }: { formId: number; patch: ProjectFormPatch }) =>
      updateProjectForm(projectKey!, formId, patch),
    onSuccess: () => {
      toast.success('Form updated');
      if (projectKey) void qc.invalidateQueries({ queryKey: qk.forms(projectKey) });
    },
  });
}

export function useDeleteProjectForm(projectKey: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: number) => deleteProjectForm(projectKey!, formId),
    onSuccess: () => {
      toast.success('Form deleted');
      if (projectKey) void qc.invalidateQueries({ queryKey: qk.forms(projectKey) });
    },
  });
}

export function usePublicFormQuery(slug: string | null) {
  return useQuery({
    queryKey: ['publicForm', slug],
    queryFn: () => getPublicForm(slug!),
    enabled: slug != null && slug.length > 0,
    retry: false,
  });
}

export function useSubmitPublicForm(slug: string) {
  return useMutation({
    mutationFn: (input: SubmitPublicFormInput) => submitPublicForm(slug, input),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type CreateCompanyInput,
  type UpdateCompanyInput,
  type SetBlacklistInput,
  type CreateContactInput,
  type UpdateContactInput,
  listCompanies,
  getCompany,
  getCompanyByTaxId,
  createCompany,
  updateCompany,
  deleteCompany,
  setCompanyBlacklist,
  listCompanyActivity,
  addCompanyContact,
  updateCompanyContact,
  deleteCompanyContact,
  uploadCompanyAttachment,
  deleteCompanyAttachment,
  fetchSunatRuc,
} from '@/lib/api/endpoints/companies';

export const companyKeys = {
  all: ['companies'] as const,
  list: (params?: {
    search?: string;
    isBlacklisted?: boolean;
    filter?: 'mine' | 'all';
    teamId?: number;
  }) => ['companies', 'list', params] as const,
  detail: (id: number) => ['companies', 'detail', id] as const,
  byTaxId: (taxId: string) => ['companies', 'taxId', taxId] as const,
  activity: (id: number) => ['companies', 'activity', id] as const,
};

export function useCompaniesQuery(params?: {
  search?: string;
  isBlacklisted?: boolean;
  filter?: 'mine' | 'all';
  teamId?: number;
}) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: () => listCompanies(params),
  });
}

export function useCompanyQuery(companyId: number | null) {
  return useQuery({
    queryKey: companyKeys.detail(companyId!),
    queryFn: () => getCompany(companyId!),
    enabled: companyId != null,
  });
}

export function useCompanyByTaxIdQuery(taxId: string | null) {
  return useQuery({
    queryKey: companyKeys.byTaxId(taxId!),
    queryFn: () => getCompanyByTaxId(taxId!),
    enabled: !!taxId,
  });
}

export function useCompanyActivityQuery(companyId: number | null) {
  return useQuery({
    queryKey: companyKeys.activity(companyId!),
    queryFn: () => listCompanyActivity(companyId!),
    enabled: companyId != null,
  });
}

export function useCreateCompanyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompany(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}

export function useUpdateCompanyMutation(companyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) => updateCompany(companyId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
      qc.invalidateQueries({ queryKey: companyKeys.list() });
    },
  });
}

export function useDeleteCompanyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (companyId: number) => deleteCompany(companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}

export function useSetCompanyBlacklistMutation(companyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetBlacklistInput) => setCompanyBlacklist(companyId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
      qc.invalidateQueries({ queryKey: companyKeys.list() });
    },
  });
}

export function useAddCompanyContactMutation(companyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactInput) => addCompanyContact(companyId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
    },
  });
}

export function useUpdateCompanyContactMutation(companyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, input }: { contactId: number; input: UpdateContactInput }) =>
      updateCompanyContact(companyId, contactId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
    },
  });
}

export function useDeleteCompanyContactMutation(companyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: number) => deleteCompanyContact(companyId, contactId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
    },
  });
}

export function useUploadCompanyAttachmentMutation(companyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta?: { documentType?: string; year?: number } }) =>
      uploadCompanyAttachment(companyId, file, meta),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
    },
  });
}

export function useDeleteCompanyAttachmentMutation(companyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => deleteCompanyAttachment(companyId, attachmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.detail(companyId) });
    },
  });
}

export function useLookupSunatMutation() {
  return useMutation({
    mutationFn: (taxId: string) => fetchSunatRuc(taxId),
  });
}

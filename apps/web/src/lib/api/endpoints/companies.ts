import { request } from '@/lib/api/core/client';

export interface CompanyOwner {
  id: string;
  name: string | null;
  email: string;
}

export interface CompanySummary {
  id: number;
  teamId: number | null;
  ownerUserId: string | null;
  createdByUserId: string | null;
  owner?: CompanyOwner | null;
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

export interface CompanyContact {
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

export interface CompanyAttachment {
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
  contacts: CompanyContact[];
  attachments: CompanyAttachment[];
}

export interface CompanyActivityIssue {
  id: number;
  sequenceNumber: number;
  title: string;
  projectId: number;
  projectKey: string;
  projectName: string;
  teamKey: string;
  columnName: string;
  columnStateType: string;
  createdAt: string;
}

export interface CreateCompanyInput {
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
}

export type UpdateCompanyInput = Partial<CreateCompanyInput>;

export interface SetBlacklistInput {
  isBlacklisted: boolean;
  blacklistReason?: string;
}

export interface CreateContactInput {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  isLegalRepresentative?: boolean;
  documentId?: string;
}

export type UpdateContactInput = Partial<CreateContactInput>;

export const listCompanies = (query?: {
  search?: string;
  isBlacklisted?: boolean;
  filter?: 'mine' | 'all';
  teamId?: number;
}) => {
  const params = new URLSearchParams();
  if (query?.search) {
    params.set('q', query.search);
  }
  if (query?.isBlacklisted !== undefined) {
    params.set('isBlacklisted', String(query.isBlacklisted));
  }
  if (query?.filter) {
    params.set('filter', query.filter);
  }
  if (query?.teamId !== undefined) {
    params.set('teamId', String(query.teamId));
  }
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<CompanySummary[]>(`/companies${qs}`);
};

export const getCompany = (companyId: number) => request<CompanyDetail>(`/companies/${companyId}`);

export const getCompanyByTaxId = (taxId: string) =>
  request<CompanyDetail>(`/companies/tax-id/${encodeURIComponent(taxId)}`);

export const createCompany = (input: CreateCompanyInput) =>
  request<CompanyDetail>('/companies', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateCompany = (companyId: number, input: UpdateCompanyInput) =>
  request<CompanyDetail>(`/companies/${companyId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteCompany = (companyId: number) =>
  request<void>(`/companies/${companyId}`, {
    method: 'DELETE',
  });

export const setCompanyBlacklist = (companyId: number, input: SetBlacklistInput) =>
  request<CompanyDetail>(`/companies/${companyId}/blacklist`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const listCompanyActivity = (companyId: number) =>
  request<CompanyActivityIssue[]>(`/companies/${companyId}/activity`);

export const addCompanyContact = (companyId: number, input: CreateContactInput) =>
  request<CompanyContact>(`/companies/${companyId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateCompanyContact = (
  companyId: number,
  contactId: number,
  input: UpdateContactInput,
) =>
  request<CompanyContact>(`/companies/${companyId}/contacts/${contactId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteCompanyContact = (companyId: number, contactId: number) =>
  request<void>(`/companies/${companyId}/contacts/${contactId}`, {
    method: 'DELETE',
  });

export const uploadCompanyAttachment = async (
  companyId: number,
  file: File,
  meta?: { documentType?: string; year?: number },
) => {
  const formData = new FormData();
  formData.append('file', file);
  if (meta?.documentType) formData.append('documentType', meta.documentType);
  if (meta?.year !== undefined) formData.append('year', String(meta.year));

  return request<CompanyAttachment>(`/companies/${companyId}/attachments`, {
    method: 'POST',
    body: formData,
  });
};

export const deleteCompanyAttachment = (companyId: number, attachmentId: number) =>
  request<void>(`/companies/${companyId}/attachments/${attachmentId}`, {
    method: 'DELETE',
  });

export interface SunatRucInfo {
  taxId: string;
  name: string;
  status: string;
  condition: string | null;
  address: string | null;
  department: string | null;
  province: string | null;
  district: string | null;
}

export const fetchSunatRuc = (taxId: string) =>
  request<SunatRucInfo>(`/companies/sunat/${encodeURIComponent(taxId.trim())}`);

import { t } from 'elysia';

export const companyParams = t.Object({ companyId: t.Numeric() });
export const companyTaxIdParams = t.Object({ taxId: t.String() });
export const companyContactParams = t.Object({
  companyId: t.Numeric(),
  contactId: t.Numeric(),
});
export const companyAttachmentParams = t.Object({
  companyId: t.Numeric(),
  attachmentId: t.Numeric(),
});

export const CompanyUserSummary = t.Object({
  id: t.String(),
  name: t.Nullable(t.String()),
  email: t.String(),
});

export const CompanyContactResponse = t.Object({
  id: t.Number(),
  companyId: t.Number(),
  name: t.String(),
  role: t.Nullable(t.String()),
  email: t.Nullable(t.String()),
  phone: t.Nullable(t.String()),
  isPrimary: t.Boolean(),
  isLegalRepresentative: t.Boolean(),
  documentId: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const CompanyAttachmentResponse = t.Object({
  id: t.Number(),
  companyId: t.Number(),
  publicId: t.String(),
  filename: t.String(),
  contentType: t.String(),
  sizeBytes: t.Number(),
  url: t.String(),
  documentType: t.Nullable(t.String()),
  year: t.Nullable(t.Number()),
  createdAt: t.String(),
});

export const CompanySummaryResponse = t.Object({
  id: t.Number(),
  teamId: t.Nullable(t.Number()),
  ownerUserId: t.Nullable(t.String()),
  createdByUserId: t.Nullable(t.String()),
  owner: t.Optional(t.Nullable(CompanyUserSummary)),
  taxId: t.String(),
  name: t.String(),
  tradeName: t.Nullable(t.String()),
  status: t.String(),
  isBlacklisted: t.Boolean(),
  blacklistReason: t.Nullable(t.String()),
  blacklistedAt: t.Nullable(t.String()),
  email: t.Nullable(t.String()),
  phone: t.Nullable(t.String()),
  city: t.Nullable(t.String()),
  country: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const CompanyDetailResponse = t.Object({
  id: t.Number(),
  teamId: t.Nullable(t.Number()),
  ownerUserId: t.Nullable(t.String()),
  createdByUserId: t.Nullable(t.String()),
  owner: t.Optional(t.Nullable(CompanyUserSummary)),
  taxId: t.String(),
  name: t.String(),
  tradeName: t.Nullable(t.String()),
  status: t.String(),
  isBlacklisted: t.Boolean(),
  blacklistReason: t.Nullable(t.String()),
  blacklistedAt: t.Nullable(t.String()),
  blacklistedByUserId: t.Nullable(t.String()),
  email: t.Nullable(t.String()),
  phone: t.Nullable(t.String()),
  address: t.Nullable(t.String()),
  city: t.Nullable(t.String()),
  country: t.Nullable(t.String()),
  website: t.Nullable(t.String()),
  notes: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
  contacts: t.Array(CompanyContactResponse),
  attachments: t.Array(CompanyAttachmentResponse),
});

export const SunatRucResponse = t.Object({
  taxId: t.String(),
  name: t.String(),
  status: t.String(),
  condition: t.Nullable(t.String()),
  address: t.Nullable(t.String()),
  department: t.Nullable(t.String()),
  province: t.Nullable(t.String()),
  district: t.Nullable(t.String()),
});

export const CompanyActivityIssueResponse = t.Object({
  id: t.Number(),
  sequenceNumber: t.Number(),
  title: t.String(),
  projectId: t.Number(),
  projectKey: t.String(),
  projectName: t.String(),
  teamKey: t.String(),
  columnName: t.String(),
  columnStateType: t.String(),
  createdAt: t.String(),
});

export const listCompaniesQuery = t.Object({
  q: t.Optional(t.String()),
  filter: t.Optional(t.Union([t.Literal('mine'), t.Literal('all')])),
  teamId: t.Optional(t.Numeric()),
  isBlacklisted: t.Optional(t.Boolean()),
});

export const createCompanyBody = t.Object({
  taxId: t.String({ minLength: 3 }),
  name: t.String({ minLength: 1 }),
  tradeName: t.Optional(t.String()),
  status: t.Optional(t.String()),
  email: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  address: t.Optional(t.String()),
  city: t.Optional(t.String()),
  country: t.Optional(t.String()),
  website: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  teamId: t.Optional(t.Numeric()),
  ownerUserId: t.Optional(t.String()),
});

export const updateCompanyBody = t.Partial(createCompanyBody);

export const setBlacklistBody = t.Object({
  isBlacklisted: t.Boolean(),
  blacklistReason: t.Optional(t.String()),
});

export const createContactBody = t.Object({
  name: t.String({ minLength: 1 }),
  role: t.Optional(t.String()),
  email: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  isPrimary: t.Optional(t.Boolean()),
  isLegalRepresentative: t.Optional(t.Boolean()),
  documentId: t.Optional(t.String()),
});

export const updateContactBody = t.Partial(createContactBody);

export const uploadCompanyAttachmentBody = t.Object({
  file: t.File(),
  documentType: t.Optional(t.String()),
  year: t.Optional(t.Numeric()),
});

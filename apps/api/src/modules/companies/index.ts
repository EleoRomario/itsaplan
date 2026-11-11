import { Elysia, t } from 'elysia';
import { noContent } from '#shared/http';
import { HttpError, rethrowDuplicate } from '#shared/lib';
import { commonErrors, errors } from '#shared/responses';
import { authContext } from '#shared/auth-context';
import {
  companyAttachmentParams,
  companyContactParams,
  companyParams,
  companyTaxIdParams,
  CompanyActivityIssueResponse,
  CompanyAttachmentResponse,
  CompanyContactResponse,
  CompanyDetailResponse,
  CompanySummaryResponse,
  SunatRucResponse,
  createCompanyBody,
  createContactBody,
  listCompaniesQuery,
  setBlacklistBody,
  updateCompanyBody,
  updateContactBody,
  uploadCompanyAttachmentBody,
} from './model';
import {
  createCompany,
  createCompanyAttachment,
  createContact,
  deleteCompany,
  deleteCompanyAttachment,
  deleteContact,
  getCompanyActivities,
  getCompanyById,
  getCompanyByTaxId,
  isCompanyManager,
  listCompanies,
  lookupSunatRuc,
  setCompanyBlacklist,
  updateCompany,
  updateContact,
} from './service';

export const companyRoutes = new Elysia({
  name: 'companies',
  detail: { tags: ['Companies'] },
})
  .use(authContext)
  .get(
    '/companies',
    async ({ query, user }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id, query.teamId);
      return await listCompanies({
        query: query.q,
        isBlacklisted: query.isBlacklisted,
        filter: query.filter,
        teamId: query.teamId,
        userId: user.id,
        isManager,
      });
    },
    {
      query: listCompaniesQuery,
      response: { 200: t.Array(CompanySummaryResponse), ...commonErrors },
      detail: { summary: 'List or search companies' },
    },
  )

  .post(
    '/companies',
    async ({ body, user, set }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id, body.teamId);
      try {
        set.status = 201;
        return await createCompany({
          ...body,
          userId: user.id,
          isManager,
        });
      } catch (err) {
        rethrowDuplicate(err, 'company');
      }
    },
    {
      body: createCompanyBody,
      response: { 201: CompanyDetailResponse, ...commonErrors, ...errors(409) },
      detail: { summary: 'Register a new company' },
    },
  )

  .get(
    '/companies/:companyId',
    async ({ params, user }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      const company = await getCompanyById(params.companyId, user.id, isManager);
      if (!company) throw new HttpError(404, 'Company not found');
      return company;
    },
    {
      params: companyParams,
      response: { 200: CompanyDetailResponse, ...commonErrors },
      detail: { summary: 'Get company details with contacts and attachments' },
    },
  )

  .get(
    '/companies/by-tax-id/:taxId',
    async ({ params, user }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      const company = await getCompanyByTaxId(params.taxId, user.id, isManager);
      if (!company) throw new HttpError(404, 'Company not found');
      return company;
    },
    {
      params: companyTaxIdParams,
      response: { 200: CompanyDetailResponse, ...commonErrors },
      detail: { summary: 'Find company by Tax ID / RUC' },
    },
  )

  .get(
    '/companies/sunat/:taxId',
    async ({ params }) => {
      const data = await lookupSunatRuc(params.taxId);
      if (!data) throw new HttpError(404, 'RUC not found in SUNAT');
      return data;
    },
    {
      params: companyTaxIdParams,
      response: { 200: SunatRucResponse, ...commonErrors },
      detail: { summary: 'Query official company info from SUNAT by RUC' },
    },
  )

  .patch(
    '/companies/:companyId',
    async ({ params, body, user }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      try {
        return await updateCompany(params.companyId, body, user.id, isManager);
      } catch (err) {
        rethrowDuplicate(err, 'company');
      }
    },
    {
      params: companyParams,
      body: updateCompanyBody,
      response: { 200: CompanyDetailResponse, ...commonErrors, ...errors(409) },
      detail: { summary: 'Update company info' },
    },
  )

  .post(
    '/companies/:companyId/blacklist',
    async ({ params, body, user }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      return await setCompanyBlacklist(
        params.companyId,
        body.isBlacklisted,
        body.blacklistReason,
        user.id,
        isManager,
      );
    },
    {
      params: companyParams,
      body: setBlacklistBody,
      response: { 200: CompanyDetailResponse, ...commonErrors },
      detail: { summary: 'Add or remove company from blacklist' },
    },
  )

  .delete(
    '/companies/:companyId',
    async ({ params, user }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      const deleted = await deleteCompany(params.companyId, user.id, isManager);
      if (!deleted) throw new HttpError(404, 'Company not found');
      return noContent();
    },
    {
      params: companyParams,
      response: { 204: t.Null(), ...commonErrors },
      detail: { summary: 'Delete a company' },
    },
  )

  .get(
    '/companies/:companyId/activities',
    async ({ params, user }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      return await getCompanyActivities(params.companyId, user.id, isManager);
    },
    {
      params: companyParams,
      response: { 200: t.Array(CompanyActivityIssueResponse), ...commonErrors },
      detail: {
        summary: 'Get all project issues/tasks linked to this company across the platform',
      },
    },
  )

  .post(
    '/companies/:companyId/contacts',
    async ({ params, body, user, set }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      set.status = 201;
      return await createContact(params.companyId, body, user.id, isManager);
    },
    {
      params: companyParams,
      body: createContactBody,
      response: { 201: CompanyContactResponse, ...commonErrors },
      detail: { summary: 'Add a contact to the company' },
    },
  )

  .patch(
    '/companies/:companyId/contacts/:contactId',
    async ({ params, body, user }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      const contact = await updateContact(
        params.contactId,
        params.companyId,
        body,
        user.id,
        isManager,
      );
      if (!contact) throw new HttpError(404, 'Contact not found');
      return contact;
    },
    {
      params: companyContactParams,
      body: updateContactBody,
      response: { 200: CompanyContactResponse, ...commonErrors },
      detail: { summary: 'Update a contact' },
    },
  )

  .delete(
    '/companies/:companyId/contacts/:contactId',
    async ({ params, user }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      const deleted = await deleteContact(params.contactId, params.companyId, user.id, isManager);
      if (!deleted) throw new HttpError(404, 'Contact not found');
      return noContent();
    },
    {
      params: companyContactParams,
      response: { 204: t.Null(), ...commonErrors },
      detail: { summary: 'Delete a contact' },
    },
  )

  .post(
    '/companies/:companyId/attachments',
    async ({ params, body, user, set }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      set.status = 201;
      return await createCompanyAttachment(
        params.companyId,
        body.file,
        user.id,
        isManager,
        body.documentType,
        body.year,
      );
    },
    {
      params: companyParams,
      body: uploadCompanyAttachmentBody,
      response: { 201: CompanyAttachmentResponse, ...commonErrors },
      detail: { summary: 'Upload a master document for this company' },
    },
  )

  .delete(
    '/companies/:companyId/attachments/:attachmentId',
    async ({ params, user }) => {
      if (!user) throw new HttpError(401, 'Authentication required');
      const isManager = await isCompanyManager(user.id);
      const deleted = await deleteCompanyAttachment(
        params.attachmentId,
        params.companyId,
        user.id,
        isManager,
      );
      if (!deleted) throw new HttpError(404, 'Attachment not found');
      return noContent();
    },
    {
      params: companyAttachmentParams,
      response: { 204: t.Null(), ...commonErrors },
      detail: { summary: 'Delete a company attachment' },
    },
  );

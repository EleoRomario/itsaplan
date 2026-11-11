import { Elysia, t } from 'elysia';
import { noContent } from '#shared/http';
import { guards } from '#shared/guards';
import { HttpError, rethrowDuplicate } from '#shared/lib';
import { commonErrors, errors } from '#shared/responses';
import {
  createFormBody,
  formParams,
  ProjectFormListResponse,
  ProjectFormResponse,
  publicFormSlugParams,
  PublicFormResponse,
  submitPublicFormBody,
  SubmitFormResponse,
  updateFormBody,
} from './model';
import {
  createProjectForm,
  deleteProjectForm,
  getProjectForm,
  getPublicForm,
  listProjectForms,
  submitPublicForm,
  updateProjectForm,
} from './service';

export const formRoutes = new Elysia({
  name: 'forms',
  detail: { tags: ['Forms'] },
})
  .get(
    '/public/forms/:slug',
    async ({ params }) => {
      const form = await getPublicForm(params.slug);
      if (!form) throw new HttpError(404, 'Form not found or disabled');
      return form;
    },
    {
      params: publicFormSlugParams,
      response: { 200: PublicFormResponse, ...commonErrors },
      detail: { summary: 'Get a public form by slug' },
    },
  )

  .post(
    '/public/forms/:slug/submit',
    async ({ params, body, set }) => {
      set.status = 201;
      return await submitPublicForm(params.slug, body);
    },
    {
      params: publicFormSlugParams,
      body: submitPublicFormBody,
      response: { 201: SubmitFormResponse, ...commonErrors },
      detail: { summary: 'Submit a response to a public form' },
    },
  )

  .use(guards)
  .get(
    '/projects/:projectKey/forms',
    async ({ project }) => {
      return await listProjectForms(project.id);
    },
    {
      permission: ['work_items', 'read'],
      response: { 200: ProjectFormListResponse, ...commonErrors },
      detail: { summary: "List a project's forms" },
    },
  )

  .post(
    '/projects/:projectKey/forms',
    async ({ project, body, set }) => {
      try {
        set.status = 201;
        return await createProjectForm(project.id, body);
      } catch (err) {
        rethrowDuplicate(err, 'slug');
      }
    },
    {
      permission: ['work_items', 'create'],
      body: createFormBody,
      response: { 201: ProjectFormResponse, ...commonErrors, ...errors(409) },
      detail: { summary: 'Create a form for the project' },
    },
  )

  .get(
    '/projects/:projectKey/forms/:formId',
    async ({ project, params }) => {
      const form = await getProjectForm(project.id, params.formId);
      if (!form) throw new HttpError(404, 'Form not found');
      return form;
    },
    {
      params: formParams,
      permission: ['work_items', 'read'],
      response: { 200: ProjectFormResponse, ...commonErrors },
      detail: { summary: "Get a form's details" },
    },
  )

  .patch(
    '/projects/:projectKey/forms/:formId',
    async ({ project, params, body }) => {
      let form;
      try {
        form = await updateProjectForm(project.id, params.formId, body);
      } catch (err) {
        rethrowDuplicate(err, 'slug');
      }
      if (!form) throw new HttpError(404, 'Form not found');
      return form;
    },
    {
      params: formParams,
      permission: ['work_items', 'edit'],
      body: updateFormBody,
      response: { 200: ProjectFormResponse, ...commonErrors, ...errors(409) },
      detail: { summary: "Update a form's settings or questions" },
    },
  )

  .delete(
    '/projects/:projectKey/forms/:formId',
    async ({ project, params }) => {
      const deleted = await deleteProjectForm(project.id, params.formId);
      if (!deleted) throw new HttpError(404, 'Form not found');
      return noContent();
    },
    {
      params: formParams,
      permission: ['work_items', 'delete'],
      response: { 204: t.Void(), ...commonErrors },
      detail: { summary: 'Delete a form' },
    },
  );

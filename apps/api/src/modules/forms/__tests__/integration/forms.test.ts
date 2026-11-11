import { describe, it, expect, beforeEach } from 'bun:test';
import { authedApi, createProject } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';

async function setupOwnerProject() {
  const owner = await signUpTestUser({ name: 'Owner' });
  const asOwner = authedApi(owner.cookie);
  const project = await createProject(asOwner, { key: 'FRM', name: 'Forms Project' });
  const view = await asOwner.projects({ projectKey: 'FRM' }).get();
  return {
    owner,
    asOwner,
    projectId: project.data!.id,
    teamRef: project.data!.teamRef,
    columnId: view.data!.columns[0].id,
  };
}

describe('forms', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates, lists, updates, and deletes forms in a project', async () => {
    const { asOwner } = await setupOwnerProject();

    const createRes = await asOwner.projects({ projectKey: 'FRM' }).forms.post({
      title: 'Customer Feedback',
      description: 'Send us your feedback',
      slug: 'feedback-test',
      enabled: true,
      questions: [
        {
          id: 'urgency',
          label: 'Urgency',
          type: 'select',
          required: true,
          options: ['Low', 'High'],
        },
      ],
    });

    expect(createRes.status).toBe(201);
    expect(createRes.data!.title).toBe('Customer Feedback');
    expect(createRes.data!.slug).toBe('feedback-test');
    expect(createRes.data!.questions).toHaveLength(1);
    const formId = createRes.data!.id;

    const listRes = await asOwner.projects({ projectKey: 'FRM' }).forms.get();
    expect(listRes.status).toBe(200);
    expect(listRes.data).toHaveLength(1);
    expect(listRes.data![0].id).toBe(formId);

    const patchRes = await asOwner.projects({ projectKey: 'FRM' }).forms({ formId }).patch({
      title: 'Updated Feedback',
      enabled: false,
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.data!.title).toBe('Updated Feedback');
    expect(patchRes.data!.enabled).toBe(false);

    const delRes = await asOwner.projects({ projectKey: 'FRM' }).forms({ formId }).delete();
    expect(delRes.status).toBe(204);

    const listAgain = await asOwner.projects({ projectKey: 'FRM' }).forms.get();
    expect(listAgain.data).toHaveLength(0);
  });

  it('allows public fetching and submission to create an issue', async () => {
    const { asOwner } = await setupOwnerProject();

    await asOwner.projects({ projectKey: 'FRM' }).forms.post({
      title: 'Bug Report',
      description: 'Report a bug to our engineering team',
      slug: 'bug-report',
      enabled: true,
      questions: [
        {
          id: 'browser',
          label: 'Browser',
          type: 'text',
          required: false,
        },
      ],
    });

    const anon = authedApi('');
    const publicRes = await anon.public.forms({ slug: 'bug-report' }).get();
    expect(publicRes.status).toBe(200);
    expect(publicRes.data!.title).toBe('Bug Report');
    expect(publicRes.data!.project.key).toBe('FRM');

    const submitRes = await anon.public.forms({ slug: 'bug-report' }).submit.post({
      name: 'Alice Public',
      email: 'alice@example.com',
      title: 'Login button does not click',
      description: 'When clicking on mobile, nothing happens.',
      answers: {
        browser: 'Safari iOS',
      },
    });

    expect(submitRes.status).toBe(201);
    expect(submitRes.data!.success).toBe(true);
    expect(submitRes.data!.issueKey).toBe('FRM-1');

    const issuesRes = await asOwner.projects({ projectKey: 'FRM' }).issues.get();
    expect(issuesRes.status).toBe(200);
    const createdSummary = issuesRes.data!.find((i) => i.identifier === 'FRM-1');
    expect(createdSummary).toBeDefined();
    expect(createdSummary!.title).toBe('Login button does not click');

    const detailRes = await asOwner.issues({ issueId: createdSummary!.id }).get();
    expect(detailRes.status).toBe(200);
    expect(detailRes.data!.description).toContain('Alice Public (alice@example.com)');
    expect(detailRes.data!.description).toContain('Safari iOS');
  });
});

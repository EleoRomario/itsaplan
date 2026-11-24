import { describe, it, expect, beforeEach } from 'bun:test';
import { authedApi, createProject } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';

describe('companies ownership & permissions', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('enforces company portfolio ownership and duplicate prevention', async () => {
    // Setup owner (manager)
    const owner = await signUpTestUser({ name: 'Manager' });
    const asOwner = authedApi(owner.cookie);
    await createProject(asOwner, { key: 'CRM', name: 'CRM Project' });

    // Setup Rep 1
    const rep1 = await signUpTestUser({ name: 'Carlos Rep' });
    const asRep1 = authedApi(rep1.cookie);

    // Setup Rep 2
    const rep2 = await signUpTestUser({ name: 'Maria Rep' });
    const asRep2 = authedApi(rep2.cookie);

    // 1. Rep 1 registers a company
    const createRes = await asRep1.companies.post({
      taxId: '20123456789',
      name: 'Tech Solutions S.A.C.',
      tradeName: 'TechSol',
    });
    expect(createRes.status).toBe(201);
    expect(createRes.data!.taxId).toBe('20123456789');
    expect(createRes.data!.ownerUserId).toBe(rep1.userId);
    const companyId = createRes.data!.id;

    // 2. Rep 1 sees their company in the list
    const rep1List = await asRep1.companies.get();
    expect(rep1List.status).toBe(200);
    expect(rep1List.data).toHaveLength(1);
    expect(rep1List.data![0].id).toBe(companyId);

    // 3. Rep 2 cannot see Rep 1's company in their list
    const rep2List = await asRep2.companies.get();
    expect(rep2List.status).toBe(200);
    expect(rep2List.data).toHaveLength(0);

    // 4. Rep 2 cannot view details of Rep 1's company
    const rep2Detail = await asRep2.companies({ companyId }).get();
    expect(rep2Detail.status).toBe(403);

    // 5. Rep 2 cannot update Rep 1's company
    const rep2Update = await asRep2.companies({ companyId }).patch({
      name: 'Hacked Name',
    });
    expect(rep2Update.status).toBe(403);

    // 6. Collision check: Rep 2 tries to register the same RUC
    const duplicateRes = await asRep2.companies.post({
      taxId: '20123456789',
      name: 'Tech Solutions Clone',
    });
    expect(duplicateRes.status).toBe(409);

    // 7. Manager/Owner can see all companies
    const ownerList = await asOwner.companies.get();
    expect(ownerList.status).toBe(200);
    expect(ownerList.data!.some((c) => c.id === companyId)).toBe(true);

    // 8. Manager can reassign the company to Rep 2
    const reassignRes = await asOwner.companies({ companyId }).patch({
      ownerUserId: rep2.userId,
    });
    expect(reassignRes.status).toBe(200);
    expect(reassignRes.data!.ownerUserId).toBe(rep2.userId);

    // 9. Now Rep 2 can see and access the company
    const rep2ListAfter = await asRep2.companies.get();
    expect(rep2ListAfter.status).toBe(200);
    expect(rep2ListAfter.data!.some((c) => c.id === companyId)).toBe(true);
  });

  it('links companies to projects and initiatives, inherits on issues, and computes portfolio stats', async () => {
    const owner = await signUpTestUser({ name: 'Manager' });
    const asOwner = authedApi(owner.cookie);

    const rep = await signUpTestUser({ name: 'Sales Rep' });
    const asRep = authedApi(rep.cookie);

    const tech = await signUpTestUser({ name: 'Tech Member' });
    const asTech = authedApi(tech.cookie);

    // Rep registers a company
    const compRes = await asRep.companies.post({
      taxId: '20987654321',
      name: 'Hotel Valle Sagrado S.A.C.',
      code: 'HVS',
    });
    expect(compRes.status).toBe(201);
    const companyId = compRes.data!.id;

    // Manager creates a dedicated project linked to the company
    const projRes = await createProject(asOwner, {
      key: 'HVS',
      name: 'Ejecución Turismo Emprende - HVS',
      companyId,
      companiesEnabled: true,
    });
    expect(projRes.status).toBe(201);
    expect(projRes.data!.companyId).toBe(companyId);
    expect(projRes.data!.company?.code).toBe('HVS');
    expect(projRes.data!.companiesEnabled).toBe(true);

    // Add tech member and rep to the project
    await asOwner
      .projects({ projectKey: 'HVS' })
      .members.post({ userId: tech.userId, role: 'member' });
    await asOwner
      .projects({ projectKey: 'HVS' })
      .members.post({ userId: rep.userId, role: 'member' });

    // Tech member (not owner, not manager) can now read the project-linked company,
    // but cannot edit it.
    const techRead = await asTech.companies({ companyId }).get();
    expect(techRead.status).toBe(200);
    expect(techRead.data!.id).toBe(companyId);

    const techEdit = await asTech.companies({ companyId }).patch({ name: 'Unauthorized' });
    expect(techEdit.status).toBe(403);

    // Create an issue without explicit companyId -> inherits project.company
    const board = await asOwner.projects({ projectKey: 'HVS' }).get();
    const todoCol = board.data!.columns.find((c) => c.stateType === 'unstarted')!;
    const doneCol = board.data!.columns.find((c) => c.stateType === 'completed')!;

    const issue1 = await asOwner.projects({ projectKey: 'HVS' }).issues.post({
      columnId: todoCol.id,
      title: 'Hito 1 - Compras',
    });
    expect(issue1.status).toBe(201);
    expect(issue1.data!.companyId).toBeNull();
    expect(issue1.data!.company?.id).toBe(companyId);

    const issue2 = await asOwner.projects({ projectKey: 'HVS' }).issues.post({
      columnId: doneCol.id,
      title: 'Hito 0 - Contrato',
    });
    expect(issue2.status).toBe(201);

    // Rep sees portfolio stats in GET /companies
    const repCompanies = await asRep.companies.get();
    expect(repCompanies.status).toBe(200);
    expect(repCompanies.data![0].stats).toMatchObject({
      projectCount: 1,
      totalIssues: 2,
      openIssues: 1,
      completedIssues: 1,
    });

    // GET /companies/:id/projects and /activities include the project and inherited issues
    const compProjects = await asRep.companies({ companyId }).projects.get();
    expect(compProjects.status).toBe(200);
    expect(compProjects.data).toHaveLength(1);
    expect(compProjects.data![0]).toMatchObject({
      key: 'HVS',
      totalIssues: 2,
      completedIssues: 1,
      openIssues: 1,
    });

    const compActivities = await asRep.companies({ companyId }).activities.get();
    expect(compActivities.status).toBe(200);
    expect(compActivities.data).toHaveLength(2);
    expect(compActivities.data!.every((a) => a.inherited)).toBe(true);

    // Multi-company project with initiative linked to company
    await createProject(asOwner, { key: 'TE', name: 'Turismo Emprende 2026' });
    await asOwner
      .projects({ projectKey: 'TE' })
      .members.post({ userId: rep.userId, role: 'member' });
    const initRes = await asOwner.projects({ projectKey: 'TE' }).initiatives.post({
      title: 'Postulación HVS',
      companyId,
    });
    expect(initRes.status).toBe(201);
    expect(initRes.data!.companyId).toBe(companyId);
    expect(initRes.data!.company?.id).toBe(companyId);

    const teBoard = await asOwner.projects({ projectKey: 'TE' }).get();
    const teTodo = teBoard.data!.columns.find((c) => c.stateType === 'unstarted')!;
    const teIssue = await asOwner.projects({ projectKey: 'TE' }).issues.post({
      columnId: teTodo.id,
      initiativeId: initRes.data!.id,
      title: 'Presupuesto TE',
    });
    expect(teIssue.status).toBe(201);
    expect(teIssue.data!.company?.id).toBe(companyId);

    const compInits = await asRep.companies({ companyId }).initiatives.get();
    expect(compInits.status).toBe(200);
    expect(compInits.data!.some((i) => i.id === initRes.data!.id)).toBe(true);

    // myCompanies filter on /projects
    const myProjects = await asRep.projects.get({ query: { myCompanies: 'true' } });
    expect(myProjects.status).toBe(200);
    expect(myProjects.data!.map((p) => p.key)).toEqual(['HVS']);
  });
});

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
});

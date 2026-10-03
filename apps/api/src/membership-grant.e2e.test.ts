import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN,
  databaseUrl,
  membershipPorts,
  post,
  resetMembershipTables,
  seedMembership,
  seedTeacherRole,
  startApp,
  unreachablePrisma,
} from './test-support';

type App = Awaited<ReturnType<typeof startApp>>;
const valid = { actorUserId: ADMIN, roleId: 'teacher' };

describe('POST /memberships/:membershipId/grants (no database needed)', () => {
  const prisma = unreachablePrisma();
  let app: App;
  beforeAll(async () => {
    app = await startApp(prisma, membershipPorts);
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it.each([
    ['empty body', {}],
    ['missing roleId', { actorUserId: ADMIN }],
    ['non-string roleId', { actorUserId: ADMIN, roleId: 3 }],
  ])('INVALID_REQUEST → 400 for %s', async (_name, body) => {
    const res = await post(`${app.url}/memberships/m-1/grants`, body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'INVALID_REQUEST' } });
  });

  it('MEM-005 → 503 and fails closed when the database is unavailable', async () => {
    const res = await post(`${app.url}/memberships/m-1/grants`, valid);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { code: 'MEM-005' } });
  });

  it('rejects non-POST methods', async () => {
    expect((await fetch(`${app.url}/memberships/m-1/grants`)).status).toBe(405);
  });
});

describe.skipIf(!databaseUrl)('POST /memberships/:membershipId/grants (real database)', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  let app: App;
  beforeAll(async () => {
    app = await startApp(prisma, membershipPorts);
  });
  beforeEach(async () => {
    await resetMembershipTables(prisma);
    await seedTeacherRole(prisma);
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('grants a Role to an ACTIVE Membership and persists the Grant', async () => {
    await seedMembership(prisma, 'm-1', 'user-1', 'ACTIVE');
    const res = await post(`${app.url}/memberships/m-1/grants`, valid);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { grantId: string };
    expect(body).toEqual({ grantId: expect.any(String) });
    const stored = await prisma.grant.findUnique({ where: { grantId: body.grantId } });
    expect(stored).toMatchObject({
      membershipId: 'm-1',
      roleId: 'teacher',
      grantedBy: ADMIN,
      revokedAt: null,
    });
  });

  it('MEM-004 → 409 for an unknown Role', async () => {
    await seedMembership(prisma, 'm-1', 'user-1', 'ACTIVE');
    const res = await post(`${app.url}/memberships/m-1/grants`, { ...valid, roleId: 'ghost' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: 'MEM-004' } });
    expect(await prisma.grant.count()).toBe(0);
  });

  it('MEM-004 → 409 for a REMOVED Role', async () => {
    await seedMembership(prisma, 'm-1', 'user-1', 'ACTIVE');
    await prisma.role.update({ where: { roleId: 'teacher' }, data: { status: 'REMOVED' } });
    const res = await post(`${app.url}/memberships/m-1/grants`, valid);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: 'MEM-004' } });
  });

  it('MEM-001 → 403 for an unknown Membership', async () => {
    const res = await post(`${app.url}/memberships/ghost/grants`, valid);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: 'MEM-001' } });
  });

  it('MEM-001 → 403 for a PENDING Membership', async () => {
    await seedMembership(prisma, 'm-1', 'user-1', 'PENDING');
    const res = await post(`${app.url}/memberships/m-1/grants`, valid);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: 'MEM-001' } });
    expect(await prisma.grant.count()).toBe(0);
  });

  it('MEM-004 → 409 for a duplicate live Grant', async () => {
    await seedMembership(prisma, 'm-1', 'user-1', 'ACTIVE');
    expect((await post(`${app.url}/memberships/m-1/grants`, valid)).status).toBe(201);
    const res = await post(`${app.url}/memberships/m-1/grants`, valid);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: 'MEM-004' } });
    expect(await prisma.grant.count()).toBe(1);
  });

  it('MEM-005 → 503 for an actor that cannot administer the School', async () => {
    await seedMembership(prisma, 'm-1', 'user-1', 'ACTIVE');
    const res = await post(`${app.url}/memberships/m-1/grants`, {
      ...valid,
      actorUserId: 'user-2',
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { code: 'MEM-005' } });
    expect(await prisma.grant.count()).toBe(0);
  });
});

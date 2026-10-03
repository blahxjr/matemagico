import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN,
  databaseUrl,
  membershipPorts,
  post,
  resetMembershipTables,
  seedMembership,
  startApp,
  unreachablePrisma,
} from './test-support';

type App = Awaited<ReturnType<typeof startApp>>;

describe('POST /memberships/:membershipId/activate (no database needed)', () => {
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
    ['non-string actorUserId', { actorUserId: 7 }],
  ])('INVALID_REQUEST → 400 for %s', async (_name, body) => {
    const res = await post(`${app.url}/memberships/m-1/activate`, body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'INVALID_REQUEST' } });
  });

  it('INVALID_REQUEST → 400 for a malformed membershipId', async () => {
    const res = await post(`${app.url}/memberships/%E0%A4%A/activate`, { actorUserId: ADMIN });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'INVALID_REQUEST' } });
  });

  it('MEM-005 → 503 and fails closed when the database is unavailable', async () => {
    const res = await post(`${app.url}/memberships/m-1/activate`, { actorUserId: ADMIN });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { code: 'MEM-005' } });
  });

  it('rejects non-POST methods', async () => {
    expect((await fetch(`${app.url}/memberships/m-1/activate`)).status).toBe(405);
  });
});

describe.skipIf(!databaseUrl)('POST /memberships/:membershipId/activate (real database)', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  let app: App;
  beforeAll(async () => {
    app = await startApp(prisma, membershipPorts);
  });
  beforeEach(() => resetMembershipTables(prisma));
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('activates a PENDING Membership and persists the state', async () => {
    await seedMembership(prisma, 'm-1', 'user-1', 'PENDING');
    const res = await post(`${app.url}/memberships/m-1/activate`, { actorUserId: ADMIN });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: 'ACTIVATED' });
    const stored = await prisma.schoolMembership.findUnique({ where: { membershipId: 'm-1' } });
    expect(stored?.state).toBe('ACTIVE');
    expect(stored?.activatedAt).not.toBeNull();
  });

  it('MEM-001 → 403 for an unknown Membership', async () => {
    const res = await post(`${app.url}/memberships/ghost/activate`, { actorUserId: ADMIN });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: 'MEM-001' } });
  });

  it('MEM-001 → 403 for an already ACTIVE Membership', async () => {
    await seedMembership(prisma, 'm-1', 'user-1', 'ACTIVE');
    const res = await post(`${app.url}/memberships/m-1/activate`, { actorUserId: ADMIN });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: 'MEM-001' } });
  });

  it('MEM-005 → 503 for an actor that cannot administer the School; state unchanged', async () => {
    await seedMembership(prisma, 'm-1', 'user-1', 'PENDING');
    const res = await post(`${app.url}/memberships/m-1/activate`, { actorUserId: 'user-2' });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { code: 'MEM-005' } });
    const stored = await prisma.schoolMembership.findUnique({ where: { membershipId: 'm-1' } });
    expect(stored?.state).toBe('PENDING');
  });
});

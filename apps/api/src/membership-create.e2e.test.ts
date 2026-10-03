import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN,
  SCHOOL,
  databaseUrl,
  membershipPorts,
  post,
  resetMembershipTables,
  startApp,
  unreachablePrisma,
} from './test-support';

type App = Awaited<ReturnType<typeof startApp>>;
const valid = { actorUserId: ADMIN, userId: 'user-1', schoolId: SCHOOL };

describe('POST /memberships (no database needed)', () => {
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
    ['missing schoolId', { actorUserId: ADMIN, userId: 'user-1' }],
    ['non-string userId', { ...valid, userId: 1 }],
    ['blank actorUserId', { ...valid, actorUserId: ' ' }],
  ])('INVALID_REQUEST â†’ 400 for %s', async (_name, body) => {
    const res = await post(`${app.url}/memberships`, body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'INVALID_REQUEST' } });
  });

  it('INVALID_REQUEST â†’ 400 for malformed JSON and non-object bodies', async () => {
    for (const raw of ['{nope', '[]']) {
      const res = await fetch(`${app.url}/memberships`, { method: 'POST', body: raw });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: { code: 'INVALID_REQUEST' } });
    }
  });

  it('MEM-005 â†’ 503 and fails closed when the database is unavailable', async () => {
    const res = await post(`${app.url}/memberships`, valid);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { code: 'MEM-005' } });
  });

  it('rejects non-POST methods', async () => {
    expect((await fetch(`${app.url}/memberships`)).status).toBe(405);
  });
});

describe('POST /memberships with the provisional ports (fail closed)', () => {
  it('MEM-005 â†’ 503 because the provisional ActorAuthorizer denies everyone', async () => {
    const prisma = unreachablePrisma();
    const app = await startApp(prisma);
    try {
      const res = await post(`${app.url}/memberships`, valid);
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: { code: 'MEM-005' } });
    } finally {
      await app.close();
      await prisma.$disconnect();
    }
  });
});

describe.skipIf(!databaseUrl)('POST /memberships against a real database', () => {
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

  it('creates a PENDING Membership and persists it', async () => {
    const res = await post(`${app.url}/memberships`, valid);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { membershipId: string; state: string };
    expect(body).toEqual({ membershipId: expect.any(String), state: 'PENDING' });
    const stored = await prisma.schoolMembership.findUnique({
      where: { membershipId: body.membershipId },
    });
    expect(stored).toMatchObject({ userId: 'user-1', schoolId: SCHOOL, state: 'PENDING' });
  });

  it('MEM-002 â†’ 404 for an unknown User, with nothing persisted', async () => {
    const res = await post(`${app.url}/memberships`, { ...valid, userId: 'ghost' });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'MEM-002' } });
    expect(await prisma.schoolMembership.count()).toBe(0);
  });

  it('MEM-003 → 404 for an unknown School, with nothing persisted', async () => {
    const anySchool = await startApp(prisma, {
      ...membershipPorts,
      actorAuthorizer: { canAdministerSchool: async (actor) => actor.userId === ADMIN },
    });
    try {
      const res = await post(`${anySchool.url}/memberships`, { ...valid, schoolId: 'ghost' });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: { code: 'MEM-003' } });
    } finally {
      await anySchool.close();
    }
    expect(await prisma.schoolMembership.count()).toBe(0);
  });

  it('MEM-001 â†’ 403 for a duplicate open Membership', async () => {
    expect((await post(`${app.url}/memberships`, valid)).status).toBe(201);
    const res = await post(`${app.url}/memberships`, valid);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: { code: 'MEM-001' } });
    expect(await prisma.schoolMembership.count()).toBe(1);
  });

  it('MEM-005 â†’ 503 for an actor that cannot administer the School', async () => {
    const res = await post(`${app.url}/memberships`, { ...valid, actorUserId: 'user-2' });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { code: 'MEM-005' } });
    expect(await prisma.schoolMembership.count()).toBe(0);
  });
});

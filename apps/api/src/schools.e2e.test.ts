import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createMembership,
  databaseUrl,
  ensureRoles,
  foundSchool,
  getJson,
  postJson,
  signUp,
  startApp,
  type App,
} from './test-support';

describe.skipIf(!databaseUrl)('schools', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  let app: App;

  beforeAll(async () => {
    await ensureRoles(prisma);
    app = await startApp(prisma);
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /schools requires authentication', async () => {
    const res = await postJson(`${app.url}/schools`, { name: 'X', slug: 'x-escola' });
    expect(res.status).toBe(401);
  });

  it('POST /schools creates the School and makes the creator SCHOOL_ADMIN', async () => {
    const user = await signUp(app, 'fundador');
    const schoolId = await foundSchool(app, user);
    const read = await getJson(`${app.url}/schools/${schoolId}`, user.token);
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ schoolId, status: 'ACTIVE' });
  });

  it('POST /schools: duplicate slug -> 409 SCH-003, invalid and forged bodies -> 400', async () => {
    const user = await signUp(app, 'fundador');
    const slug = `unica-${Date.now()}`;
    expect(
      (await postJson(`${app.url}/schools`, { name: 'A', slug }, false, user.token)).status,
    ).toBe(201);
    const dup = await postJson(`${app.url}/schools`, { name: 'B', slug }, false, user.token);
    expect(dup.status).toBe(409);
    expect(await dup.json()).toEqual({ error: { code: 'SCH-003' } });

    for (const body of [{}, { name: '', slug: 'x' }, { name: 'A', slug: 'b', ownerId: 'u1' }]) {
      const res = await postJson(`${app.url}/schools`, body, false, user.token);
      expect(res.status).toBe(400);
    }
  });

  it('GET /schools/:id is 401 without a Session and 403 for a non-member', async () => {
    const owner = await signUp(app, 'dono');
    const stranger = await signUp(app, 'estranho');
    const schoolId = await foundSchool(app, owner);

    expect((await getJson(`${app.url}/schools/${schoolId}`)).status).toBe(401);
    const denied = await getJson(`${app.url}/schools/${schoolId}`, stranger.token);
    expect(denied.status).toBe(403);
    const missing = await getJson(`${app.url}/schools/inexistente`, owner.token);
    expect(missing.status).toBe(403);
  });

  it('GET /schools/:id is 403 for a member whose Membership is still PENDING', async () => {
    const owner = await signUp(app, 'dono');
    const pending = await signUp(app, 'pendente');
    const schoolId = await foundSchool(app, owner);
    await createMembership(app, owner, pending.userId, schoolId);
    const res = await getJson(`${app.url}/schools/${schoolId}`, pending.token);
    expect(res.status).toBe(403);
  });
});

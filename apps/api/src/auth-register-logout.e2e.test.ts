import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PASSWORD,
  databaseUrl,
  ensureRoles,
  foundSchool,
  getJson,
  postJson,
  signUp,
  startApp,
  type App,
} from './test-support';

describe.skipIf(!databaseUrl)('register, me and logout', () => {
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

  it('POST /auth/register creates a usable ACTIVE User and never returns secrets', async () => {
    const email = `novo-${Date.now()}@escola.test`;
    const res = await postJson(`${app.url}/auth/register`, {
      email,
      name: 'Novo',
      password: PASSWORD,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, string>;
    expect(body).toEqual({ userId: expect.any(String), email, name: 'Novo' });
    const login = await postJson(`${app.url}/auth/login`, { email, password: PASSWORD });
    expect(login.status).toBe(200);
  });

  it('POST /auth/register rejects duplicates (USR-003), weak passwords and unknown fields', async () => {
    const user = await signUp(app, 'dup');
    const dup = await postJson(`${app.url}/auth/register`, {
      email: user.email,
      name: 'Dup',
      password: PASSWORD,
    });
    expect(dup.status).toBe(409);
    expect(await dup.json()).toEqual({ error: { code: 'USR-003' } });

    for (const body of [
      { email: 'a@b.test', name: 'X', password: 'short' },
      { email: 'not-an-email', name: 'X', password: PASSWORD },
      { email: 'a@b.test', name: 'X', password: PASSWORD, status: 'ACTIVE' },
    ]) {
      const res = await postJson(`${app.url}/auth/register`, body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: { code: 'AUTH-005' } });
    }
  });

  it('GET /auth/me returns the profile derived from the Session', async () => {
    const admin = await signUp(app, 'admin');
    const schoolId = await foundSchool(app, admin);
    const res = await getJson(`${app.url}/auth/me`, admin.token);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      userId: admin.userId,
      email: admin.email,
      roles: ['SCHOOL_ADMIN'],
      schools: [{ schoolId, roles: ['SCHOOL_ADMIN'] }],
    });
  });

  it('GET /me/export returns the user profile and memberships, and audits the export', async () => {
    const user = await signUp(app, 'export');
    const schoolId = await foundSchool(app, user);
    const response = await getJson(`${app.url}/me/export`, user.token);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      profile: { userId: string };
      memberships: Array<{ schoolId: string; state: string }>;
      attempts: unknown[];
    };
    expect(body.profile.userId).toBe(user.userId);
    expect(body.memberships).toContainEqual(expect.objectContaining({ schoolId, state: 'ACTIVE' }));
    expect(body.attempts).toEqual([]);
    expect(JSON.stringify(body)).not.toMatch(/password|credential|sessionId/i);
    expect(
      await prisma.auditEvent.count({
        where: { actorUserId: user.userId, action: 'privacy.data.exported' },
      }),
    ).toBe(1);
  });

  it('POST /me/deactivate logically disables the user and revokes active sessions', async () => {
    const user = await signUp(app, 'deactivate');
    const response = await postJson(`${app.url}/me/deactivate`, {}, false, user.token);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: 'DEACTIVATED' });
    expect(await prisma.user.findUnique({ where: { userId: user.userId } })).toMatchObject({
      status: 'INACTIVE',
    });
    expect(await prisma.session.count({ where: { userId: user.userId, revokedAt: null } })).toBe(0);
    expect((await getJson(`${app.url}/auth/me`, user.token)).status).toBe(401);
    expect(
      await prisma.auditEvent.count({
        where: { actorUserId: user.userId, action: 'privacy.user.deactivated' },
      }),
    ).toBe(1);
  });

  it('GET /auth/me without or with an invalid token -> 401 AUTH-003', async () => {
    for (const token of [undefined, 'unknown-session']) {
      const res = await getJson(`${app.url}/auth/me`, token);
      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toBe('Bearer');
      expect(await res.json()).toEqual({ error: { code: 'AUTH-003' } });
    }
  });

  it('POST /auth/logout revokes the Session', async () => {
    const user = await signUp(app, 'saida');
    const out = await postJson(`${app.url}/auth/logout`, {}, false, user.token);
    expect(out.status).toBe(200);
    expect(await out.json()).toEqual({ result: 'REVOKED' });
    expect(
      await prisma.auditEvent.count({
        where: { actorUserId: user.userId, action: 'auth.logout' },
      }),
    ).toBe(1);
    const me = await getJson(`${app.url}/auth/me`, user.token);
    expect(me.status).toBe(401);
    const again = await postJson(`${app.url}/auth/logout`, {}, false, user.token);
    expect(again.status).toBe(401);
  });
});

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createMembership,
  databaseUrl,
  ensureRoles,
  foundSchool,
  postJson,
  signUp,
  startApp,
  type App,
} from './test-support';

describe.skipIf(!databaseUrl)('memberships with Session-derived Actor', () => {
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

  const json = async (res: Response) => (await res.json()) as Record<string, any>;

  it('admin creates, activates and grants STUDENT end to end', async () => {
    const admin = await signUp(app, 'admin');
    const student = await signUp(app, 'aluno');
    const schoolId = await foundSchool(app, admin);

    const created = await postJson(
      `${app.url}/memberships`,
      { userId: student.userId, schoolId },
      false,
      admin.token,
    );
    expect(created.status).toBe(201);
    const { membershipId, state } = await json(created);
    expect(state).toBe('PENDING');

    const activated = await postJson(
      `${app.url}/memberships/${membershipId}/activate`,
      {},
      false,
      admin.token,
    );
    expect(activated.status).toBe(200);
    expect(await json(activated)).toEqual({ result: 'ACTIVATED' });

    const granted = await postJson(
      `${app.url}/memberships/${membershipId}/grants`,
      { roleId: 'STUDENT' },
      false,
      admin.token,
    );
    expect(granted.status).toBe(201);
    expect(await json(granted)).toEqual({ grantId: expect.any(String) });
  });

  it('401 without a Session on every membership route', async () => {
    for (const path of ['/memberships', '/memberships/x/activate', '/memberships/x/grants']) {
      const res = await postJson(`${app.url}${path}`, {});
      expect(res.status).toBe(401);
      expect(await json(res)).toEqual({ error: { code: 'AUTH-003' } });
    }
  });

  it('CA-12 privilege escalation: a student cannot activate a membership -> 403', async () => {
    const admin = await signUp(app, 'admin');
    const student = await signUp(app, 'aluno');
    const outsider = await signUp(app, 'novato');
    const schoolId = await foundSchool(app, admin);
    const studentMembership = await createMembership(app, admin, student.userId, schoolId);
    await postJson(`${app.url}/memberships/${studentMembership}/activate`, {}, false, admin.token);
    const pending = await createMembership(app, admin, outsider.userId, schoolId);

    for (const actor of [student, outsider]) {
      const res = await postJson(
        `${app.url}/memberships/${pending}/activate`,
        {},
        false,
        actor.token,
      );
      expect(res.status).toBe(403);
      expect(await json(res)).toEqual({ error: { code: 'MEM-005' } });
    }
    const stored = await prisma.schoolMembership.findUniqueOrThrow({
      where: { membershipId: pending },
    });
    expect(stored.state).toBe('PENDING');
  });

  it('CA-12 improper grant: granting SCHOOL_ADMIN is forbidden -> 403', async () => {
    const admin = await signUp(app, 'admin');
    const student = await signUp(app, 'aluno');
    const schoolId = await foundSchool(app, admin);
    const membershipId = await createMembership(app, admin, student.userId, schoolId);
    await postJson(`${app.url}/memberships/${membershipId}/activate`, {}, false, admin.token);

    // The student tries to promote themselves.
    const self = await postJson(
      `${app.url}/memberships/${membershipId}/grants`,
      { roleId: 'SCHOOL_ADMIN' },
      false,
      student.token,
    );
    expect(self.status).toBe(403);
    // Even the school admin cannot hand out SCHOOL_ADMIN: it is not in the allowlist.
    const byAdmin = await postJson(
      `${app.url}/memberships/${membershipId}/grants`,
      { roleId: 'SCHOOL_ADMIN' },
      false,
      admin.token,
    );
    expect(byAdmin.status).toBe(403);
    expect(await prisma.grant.count({ where: { membershipId, roleId: 'SCHOOL_ADMIN' } })).toBe(0);
  });

  it('CA-12 forged identity: actorUserId in the body is rejected (400) and never used', async () => {
    const admin = await signUp(app, 'admin');
    const student = await signUp(app, 'aluno');
    const schoolId = await foundSchool(app, admin);

    // The attacker is the student, claiming to be the admin.
    const res = await postJson(
      `${app.url}/memberships`,
      { actorUserId: admin.userId, userId: student.userId, schoolId },
      false,
      student.token,
    );
    expect(res.status).toBe(400);
    expect(await json(res)).toEqual({ error: { code: 'INVALID_REQUEST' } });
    expect(await prisma.schoolMembership.count({ where: { schoolId } })).toBe(1);

    const viaQuery = await postJson(
      `${app.url}/memberships?actorUserId=${admin.userId}`,
      { userId: student.userId, schoolId },
      false,
      student.token,
    );
    expect(viaQuery.status).toBe(400);
  });

  it('CA-07: creating a membership for an inactive user or school is rejected', async () => {
    const admin = await signUp(app, 'admin');
    const inactive = await signUp(app, 'inativo');
    const schoolId = await foundSchool(app, admin);
    await prisma.user.update({ where: { userId: inactive.userId }, data: { status: 'INACTIVE' } });

    const userRes = await postJson(
      `${app.url}/memberships`,
      { userId: inactive.userId, schoolId },
      false,
      admin.token,
    );
    expect(userRes.status).toBe(404);
    expect(await json(userRes)).toEqual({ error: { code: 'MEM-002' } });

    const other = await signUp(app, 'outro');
    await prisma.school.update({ where: { schoolId }, data: { status: 'INACTIVE' } });
    const schoolRes = await postJson(
      `${app.url}/memberships`,
      { userId: other.userId, schoolId },
      false,
      admin.token,
    );
    expect(schoolRes.status).toBe(404);
    expect(await json(schoolRes)).toEqual({ error: { code: 'MEM-003' } });
  });

  it('rejects malformed input with INVALID_REQUEST', async () => {
    const admin = await signUp(app, 'admin');
    for (const [path, body] of [
      ['/memberships', { userId: 1, schoolId: 'x' }],
      ['/memberships', {}],
      ['/memberships/abc/grants', {}],
      ['/memberships/abc/grants', { roleId: 'STUDENT', extra: true }],
      ['/memberships/abc/activate', { actorUserId: 'x' }],
    ] as const) {
      const res = await postJson(`${app.url}${path}`, body, false, admin.token);
      expect(res.status).toBe(400);
    }
  });
});

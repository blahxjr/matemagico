import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { createCompositionRoot } from './index';

const databaseUrl = process.env.TEST_DATABASE_URL;
const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;
afterAll(() => prisma?.$disconnect());

const PASSWORD = 'integration-password-1';
const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'NO_ERROR',
    (error: { code?: string }) => error.code ?? 'UNEXPECTED',
  );

describe.skipIf(!prisma)('real ports on PostgreSQL (no provisional implementations)', () => {
  const client = prisma!;
  const root = createCompositionRoot(client);
  const { services } = root;
  const run = randomUUID().slice(0, 8);

  async function ensureRoles(): Promise<void> {
    for (const [roleId, privileged, permissions] of [
      [
        'SCHOOL_ADMIN',
        true,
        ['membership:create', 'membership:activate', 'role:grant', 'school:update'],
      ],
      ['STUDENT', false, ['school:read']],
    ] as const) {
      await client.role.upsert({
        where: { roleId },
        update: {},
        create: { roleId, code: roleId, scope: 'SCHOOL', status: 'APPROVED', privileged },
      });
      for (const permissionCode of permissions) {
        await client.rolePermission.upsert({
          where: { roleId_permissionCode: { roleId, permissionCode } },
          update: {},
          create: { roleId, permissionCode },
        });
      }
    }
  }

  it('runs the full school flow: users, schools, login, membership, grants and authorization', async () => {
    await ensureRoles();

    const school = await services.createSchool.execute({
      name: `Escola ${run}`,
      slug: `escola-${run}`,
    });
    await expect(
      services.createSchool.execute({ name: 'Dup', slug: `escola-${run}` }),
    ).rejects.toMatchObject({ code: 'SCH-003' });

    const admin = await services.createUser.execute({
      email: `admin-${run}@escola.test`,
      name: 'Admin',
    });
    await expect(
      services.createUser.execute({ email: `ADMIN-${run}@escola.test`, name: 'Dup' }),
    ).rejects.toMatchObject({ code: 'USR-003' });
    await services.provisionPasswordCredential.execute({
      userId: admin.userId,
      subject: admin.email,
      password: PASSWORD,
    });

    const stored = await client.passwordCredential.findFirstOrThrow({
      where: { authAccount: { userId: admin.userId } },
    });
    expect(stored.encodedHash).toMatch(/^\$argon2id\$v=19\$/);
    expect(stored.hashAlgorithm).toBe('ARGON2ID');

    // Real login through the real UserRepository and Argon2id verifier.
    const login = { email: admin.email.toUpperCase(), password: PASSWORD, clientIp: '203.0.113.7' };
    await expect(services.authenticateUser.execute(login)).resolves.toBeDefined();
    expect(
      await codeOf(services.authenticateUser.execute({ ...login, password: 'wrong-password-123' })),
    ).toBe('AUTH-001');
    expect(
      await codeOf(services.authenticateUser.execute({ ...login, email: 'nobody@escola.test' })),
    ).toBe('AUTH-001');

    // Bootstrap the first SCHOOL_ADMIN directly; every later step goes through the services.
    const now = new Date();
    const adminMembership = await client.schoolMembership.create({
      data: {
        membershipId: randomUUID(),
        userId: admin.userId,
        schoolId: school.schoolId,
        state: 'ACTIVE',
        createdAt: now,
        activatedAt: now,
      },
    });
    await client.grant.create({
      data: {
        grantId: randomUUID(),
        membershipId: adminMembership.membershipId,
        roleId: 'SCHOOL_ADMIN',
        schoolId: school.schoolId,
        grantedBy: admin.userId,
        validFrom: new Date(now.getTime() - 1000),
      },
    });
    await client.roleGrantAllowlist.create({
      data: { actorUserId: admin.userId, schoolId: school.schoolId, roleId: 'STUDENT' },
    });
    const actor = { userId: admin.userId };
    expect(await root.actorAuthorizer.canAdministerSchool(actor, school.schoolId)).toBe(true);
    expect(await root.actorAuthorizer.canManageSchool(actor, school.schoolId)).toBe(true);
    expect(await root.actorAuthorizer.canActivateMembership(actor, school.schoolId)).toBe(true);
    expect(await root.actorAuthorizer.canGrantRole(actor, school.schoolId, 'STUDENT')).toBe(true);
    expect(await root.actorAuthorizer.canGrantRole(actor, school.schoolId, 'TEACHER')).toBe(false);

    // Membership with the real UserDirectory, SchoolDirectory and ActorAuthorizer.
    const student = await services.createUser.execute({
      email: `aluno-${run}@escola.test`,
      name: 'Aluno',
    });
    const pending = await services.createMembership.execute({
      actor,
      userId: student.userId,
      schoolId: school.schoolId,
    });
    expect(pending.state).toBe('PENDING');

    const outsider = await services.createUser.execute({
      email: `fora-${run}@escola.test`,
      name: 'Fora',
    });
    expect(
      await codeOf(
        services.createMembership.execute({
          actor: { userId: outsider.userId },
          userId: student.userId,
          schoolId: school.schoolId,
        }),
      ),
    ).toBe('MEM-005');
    expect(
      await codeOf(
        services.createMembership.execute({
          actor,
          userId: randomUUID(),
          schoolId: school.schoolId,
        }),
      ),
    ).not.toBe('NO_ERROR');

    await services.activateMembership.execute({ actor, membershipId: pending.membershipId });
    await services.grantRole.execute({
      actor,
      membershipId: pending.membershipId,
      roleId: 'STUDENT',
      validFrom: new Date(Date.now() - 1000),
    });
    const permissions = await services.resolvePermissions.execute({
      actor: { userId: student.userId },
      context: {
        userId: student.userId,
        schoolId: school.schoolId,
        membershipId: pending.membershipId,
      },
      action: 'school:read',
    });
    expect(permissions.permissions).toContain('school:read');

    // A student is not a SCHOOL_ADMIN, and cannot deactivate the School.
    expect(
      await root.actorAuthorizer.canAdministerSchool({ userId: student.userId }, school.schoolId),
    ).toBe(false);
    await expect(
      services.deactivateSchool.execute({
        schoolId: school.schoolId,
        actor: { userId: student.userId },
      }),
    ).rejects.toMatchObject({ code: 'SCH-005' });

    // Deactivation takes effect through the directories.
    await services.deactivateUser.execute({ userId: student.userId });
    expect(await root.directories.users.isActiveUser(student.userId)).toBe(false);
    await services.deactivateUser.execute({ userId: admin.userId });
    expect(await codeOf(services.authenticateUser.execute(login))).toBe('AUTH-001');

    expect(await root.directories.schools.isEnabledSchool(school.schoolId)).toBe(true);
    await services.deactivateSchool.execute({ schoolId: school.schoolId, actor });
    expect(await root.directories.schools.isEnabledSchool(school.schoolId)).toBe(false);
    expect((await services.findSchoolBySlug.execute({ slug: school.slug })).status).toBe(
      'INACTIVE',
    );
  });
});

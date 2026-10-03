import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ActivateMembershipService } from '../../../application/activate-membership/activate-membership.service';
import { CreateMembershipService } from '../../../application/create-membership/create-membership.service';
import { GrantRoleService } from '../../../application/grant-role/grant-role.service';
import { ResolvePermissionsService } from '../../../application/school-context/resolve-permissions.service';
import { ResolveSchoolContextService } from '../../../application/school-context/resolve-school-context.service';
import { ValidateSchoolContextService } from '../../../application/school-context/validate-school-context.service';
import {
  GrantPrismaRepository,
  PermissionPrismaRepository,
  RolePrismaRepository,
  SchoolMembershipPrismaRepository,
} from './index';

const NOW = new Date('2026-01-01T12:00:00.000Z');
const databaseUrl = process.env.TEST_DATABASE_URL;
const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'NO_ERROR',
    (error: { code?: string }) => error.code ?? 'UNEXPECTED',
  );

describe.skipIf(!prisma)('Membership and School Context services on Prisma adapters', () => {
  const client = prisma!;
  const memberships = new SchoolMembershipPrismaRepository(client);
  const roles = new RolePrismaRepository(client);
  const grants = new GrantPrismaRepository(client);
  const permissions = new PermissionPrismaRepository(client);

  const schools = new Set(['school-1']);
  const users = new Set(['user-1']);
  const clock = { now: () => NOW };
  const userDirectory = { isActiveUser: async (id: string) => users.has(id) };
  const schoolDirectory = { isEnabledSchool: async (id: string) => schools.has(id) };
  const authorizer = {
    canAdministerSchool: async (a: { userId: string }) => a.userId === 'admin-1',
  };
  const events = {
    publishMembershipCreated: async () => undefined,
    publishRoleGranted: async () => undefined,
  };
  const counter = { m: 0, g: 0 };

  const create = new CreateMembershipService({
    memberships,
    actorAuthorizer: authorizer,
    users: userDirectory,
    schools: schoolDirectory,
    clock,
    membershipIds: { next: () => `membership-${++counter.m}` },
  });
  const activate = new ActivateMembershipService({
    memberships,
    actorAuthorizer: authorizer,
    users: userDirectory,
    schools: schoolDirectory,
    events,
    clock,
  });
  const grantRole = new GrantRoleService({
    memberships,
    roles,
    grants,
    actorAuthorizer: authorizer,
    schools: schoolDirectory,
    events,
    clock,
    grantIds: { next: () => `grant-${++counter.g}` },
  });
  const context = new ResolveSchoolContextService({
    memberships,
    users: userDirectory,
    schools: schoolDirectory,
    clock,
  });
  const resolvePermissions = new ResolvePermissionsService({
    schoolContext: context,
    grants,
    roles,
    permissions,
    clock,
  });
  const validate = new ValidateSchoolContextService({
    memberships,
    users: userDirectory,
    schools: schoolDirectory,
  });

  const admin = { userId: 'admin-1' };
  const actor = { userId: 'user-1' };

  beforeEach(async () => {
    counter.m = 0;
    counter.g = 0;
    schools.add('school-1');
    users.add('user-1');
    await client.grant.deleteMany();
    await client.rolePermission.deleteMany();
    await client.roleGrantAllowlist.deleteMany();
    await client.role.deleteMany();
    await client.schoolMembership.deleteMany();
    await client.role.create({
      data: {
        roleId: 'teacher',
        code: 'TEACHER',
        scope: 'SCHOOL',
        status: 'APPROVED',
        privileged: false,
      },
    });
    await client.roleGrantAllowlist.create({
      data: { actorUserId: 'admin-1', schoolId: 'school-1', roleId: 'teacher' },
    });
    await client.rolePermission.createMany({
      data: [
        { roleId: 'teacher', permissionCode: 'class:read' },
        { roleId: 'teacher', permissionCode: 'class:create' },
      ],
    });
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('Create → Activate → GrantRole → ResolveSchoolContext → ResolvePermissions → Validate', async () => {
    const created = await create.execute({ userId: 'user-1', schoolId: 'school-1', actor: admin });
    expect(created).toMatchObject({ state: 'PENDING' });
    expect(await codeOf(context.execute({ actor, schoolId: 'school-1' }))).toBe('SC-002');

    await activate.execute({ membershipId: created.membershipId, actor: admin });
    await grantRole.execute({
      membershipId: created.membershipId,
      roleId: 'teacher',
      validFrom: NOW,
      actor: admin,
    });

    const resolved = await context.execute({ actor, schoolId: 'school-1' });
    expect(resolved).toMatchObject({
      result: 'CONTEXT_RESOLVED',
      membershipId: created.membershipId,
    });
    const allowed = await resolvePermissions.execute({
      actor,
      context: resolved,
      action: 'class:create',
    });
    expect(allowed).toMatchObject({
      result: 'ALLOWED',
      permissions: ['class:create', 'class:read'],
    });
    expect(await validate.execute({ actor, context: resolved })).toMatchObject({ result: 'VALID' });
  });

  it('keeps the error contract: duplicate Membership, duplicate Grant, wrong state', async () => {
    const { membershipId } = await create.execute({
      userId: 'user-1',
      schoolId: 'school-1',
      actor: admin,
    });
    expect(
      await codeOf(create.execute({ userId: 'user-1', schoolId: 'school-1', actor: admin })),
    ).toBe('MEM-001');
    expect(
      await codeOf(
        grantRole.execute({ membershipId, roleId: 'teacher', validFrom: NOW, actor: admin }),
      ),
    ).toBe('MEM-001');

    await activate.execute({ membershipId, actor: admin });
    expect(await codeOf(activate.execute({ membershipId, actor: admin }))).toBe('MEM-001');

    await grantRole.execute({ membershipId, roleId: 'teacher', validFrom: NOW, actor: admin });
    expect(
      await codeOf(
        grantRole.execute({ membershipId, roleId: 'teacher', validFrom: NOW, actor: admin }),
      ),
    ).toBe('MEM-004');
    expect(
      await codeOf(
        grantRole.execute({ membershipId, roleId: 'ghost', validFrom: NOW, actor: admin }),
      ),
    ).toBe('MEM-004');
    expect(await client.grant.count()).toBe(1);
  });

  it('fails closed when the database is unavailable', async () => {
    const broken = new PrismaClient({
      datasourceUrl: 'postgresql://postgres:x@127.0.0.1:1/none?connect_timeout=1',
    });
    const brokenMemberships = new SchoolMembershipPrismaRepository(broken);
    const service = new CreateMembershipService({
      memberships: brokenMemberships,
      actorAuthorizer: authorizer,
      users: userDirectory,
      schools: schoolDirectory,
      clock,
      membershipIds: { next: () => 'membership-x' },
    });
    expect(
      await codeOf(service.execute({ userId: 'user-1', schoolId: 'school-1', actor: admin })),
    ).toBe('MEM-005');
    await broken.$disconnect();
  });
});

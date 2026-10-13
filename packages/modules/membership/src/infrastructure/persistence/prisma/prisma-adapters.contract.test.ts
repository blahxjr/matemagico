import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Grant } from '../../../domain/entities/grant';
import { Role } from '../../../domain/entities/role';
import { RolePermission } from '../../../domain/entities/role-permission';
import { SchoolMembership } from '../../../domain/entities/school-membership';
import type { GrantRepository } from '../../../domain/repositories/grant.repository';
import type { PermissionRepository } from '../../../domain/repositories/permission.repository';
import type { RoleRepository } from '../../../domain/repositories/role.repository';
import type { SchoolMembershipRepository } from '../../../domain/repositories/school-membership.repository';
import {
  grantId,
  membershipId,
  roleId,
  schoolId,
  userId,
} from '../../../domain/value-objects/identifiers';
import { InMemoryGrantRepository } from '../../in-memory/in-memory-grant.repository';
import { InMemoryPermissionRepository } from '../../in-memory/in-memory-permission.repository';
import { InMemoryRoleRepository } from '../../in-memory/in-memory-role.repository';
import { InMemorySchoolMembershipRepository } from '../../in-memory/in-memory-school-membership.repository';
import {
  GrantPrismaRepository,
  PermissionPrismaRepository,
  RolePrismaRepository,
  SchoolMembershipPrismaRepository,
} from './index';

const T0 = new Date('2026-01-01T12:00:00.000Z');
const HOUR = 3_600_000;
const at = (hours: number) => new Date(T0.getTime() + hours * HOUR);

interface Backend {
  memberships: SchoolMembershipRepository;
  roles: RoleRepository;
  grants: GrantRepository;
  permissions: PermissionRepository;
  /** Seeds state directly, bypassing the repositories under test. */
  seedMembership(membership: SchoolMembership): Promise<void>;
  seedRole(role: Role, grantableBy?: string): Promise<void>;
  seedPermission(association: RolePermission): Promise<void>;
  reset(): Promise<void>;
}

const inMemoryBackend = (): Backend => {
  const memberships = new InMemorySchoolMembershipRepository();
  const roles = new InMemoryRoleRepository();
  const grants = new InMemoryGrantRepository();
  const permissions = new InMemoryPermissionRepository();
  return {
    memberships,
    roles,
    grants,
    permissions,
    seedMembership: async (m) => void memberships.store.set(m.id, m),
    seedRole: async (role, actor) => {
      roles.roles.set(role.id, role);
      if (actor)
        roles.allowlist.set(actor, new Set([...(roles.allowlist.get(actor) ?? []), role.id]));
    },
    seedPermission: async (a) => void permissions.associations.push(a),
    reset: async () => undefined,
  };
};

const databaseUrl = process.env.TEST_DATABASE_URL;
const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;

const prismaBackend = (client: PrismaClient): Backend => ({
  memberships: new SchoolMembershipPrismaRepository(client),
  roles: new RolePrismaRepository(client),
  grants: new GrantPrismaRepository(client),
  permissions: new PermissionPrismaRepository(client),
  seedMembership: async (m) => {
    await client.schoolMembership.create({
      data: {
        membershipId: m.id,
        userId: m.userId,
        schoolId: m.schoolId,
        state: m.state,
        createdAt: m.createdAt,
        activatedAt: m.activatedAt,
        revokedAt: m.revokedAt,
      },
    });
  },
  seedRole: async (role, actor) => {
    await client.role.create({
      data: {
        roleId: role.id,
        code: role.code,
        scope: role.scope,
        status: role.status,
        privileged: role.privileged,
      },
    });
    if (actor) {
      await client.roleGrantAllowlist.create({
        data: { actorUserId: actor, schoolId: 'school-1', roleId: role.id },
      });
    }
  },
  seedPermission: async (a) => {
    await client.rolePermission.create({
      data: { roleId: a.roleId, permissionCode: a.permissionCode },
    });
  },
  reset: async () => {
    await client.grant.deleteMany();
    await client.rolePermission.deleteMany();
    await client.roleGrantAllowlist.deleteMany();
    await client.role.deleteMany();
    await client.schoolMembership.deleteMany();
  },
});

const membership = (
  id: string,
  state: 'PENDING' | 'ACTIVE' | 'REVOKED' = 'PENDING',
  user = 'user-1',
  school = 'school-1',
) =>
  SchoolMembership.restore({
    membershipId: id,
    userId: user,
    schoolId: school,
    state,
    createdAt: at(Number(id.replace(/\D/g, '')) || 0),
    activatedAt: state === 'PENDING' ? null : T0,
    revokedAt: state === 'REVOKED' ? T0 : null,
  });

const teacher = Role.restore({
  roleId: 'teacher',
  code: 'TEST_TEACHER',
  scope: 'SCHOOL',
  status: 'APPROVED',
  privileged: false,
});

const grant = (id: string, overrides: Partial<Parameters<typeof Grant.restore>[0]> = {}) =>
  Grant.restore({
    grantId: id,
    membershipId: 'm-1',
    roleId: 'teacher',
    schoolId: 'school-1',
    grantedBy: 'admin-1',
    validFrom: T0,
    ...overrides,
  });

function repositoryContract(name: string, create: () => Backend, skip = false) {
  describe.skipIf(skip)(`${name}: repository contract`, () => {
    let b: Backend;
    beforeEach(async () => {
      b = create();
      await b.reset();
    });

    describe('SchoolMembershipRepository', () => {
      it('adds a PENDING Membership and finds it by id', async () => {
        expect(await b.memberships.add(membership('m-1'))).toBe('CREATED');
        const found = await b.memberships.findById(membershipId('m-1'));
        expect(found).toMatchObject({ id: 'm-1', userId: 'user-1', schoolId: 'school-1' });
        expect(found?.state).toBe('PENDING');
        expect(found?.createdAt).toEqual(at(1));
        expect(await b.memberships.findById(membershipId('absent'))).toBeNull();
      });

      it('answers CONFLICT for a repeated id or an open Userâ€“School pair', async () => {
        await b.memberships.add(membership('m-1'));
        expect(await b.memberships.add(membership('m-1', 'PENDING', 'user-2'))).toBe('CONFLICT');
        expect(await b.memberships.add(membership('m-2'))).toBe('CONFLICT');
        expect(await b.memberships.add(membership('m-3', 'PENDING', 'user-1', 'school-2'))).toBe(
          'CREATED',
        );
      });

      it('allows a new cycle once the previous one is REVOKED and keeps the history', async () => {
        await b.seedMembership(membership('m-1', 'REVOKED'));
        expect(
          await b.memberships.findOpenByUserAndSchool(userId('user-1'), schoolId('school-1')),
        ).toBeNull();
        expect(await b.memberships.add(membership('m-2'))).toBe('CREATED');
        const cycles = await b.memberships.listByUserAndSchool(
          userId('user-1'),
          schoolId('school-1'),
        );
        expect(cycles.map((m) => [m.id, m.state])).toEqual([
          ['m-1', 'REVOKED'],
          ['m-2', 'PENDING'],
        ]);
        const open = await b.memberships.findOpenByUserAndSchool(
          userId('user-1'),
          schoolId('school-1'),
        );
        expect(open?.id).toBe('m-2');
      });

      it('activates only a PENDING Membership, once', async () => {
        await b.memberships.add(membership('m-1'));
        expect(await b.memberships.activate(membershipId('m-1'), at(5))).toBe(true);
        const active = await b.memberships.findById(membershipId('m-1'));
        expect(active?.state).toBe('ACTIVE');
        expect(active?.activatedAt).toEqual(at(5));
        expect(await b.memberships.activate(membershipId('m-1'), at(6))).toBe(false);
        expect(await b.memberships.activate(membershipId('absent'), at(6))).toBe(false);
        await b.seedMembership(membership('m-9', 'REVOKED', 'user-9'));
        expect(await b.memberships.activate(membershipId('m-9'), at(6))).toBe(false);
      });

      it('never lets concurrent creations or activations both succeed', async () => {
        const adds = await Promise.all(
          [1, 2, 3, 4, 5].map((n) => b.memberships.add(membership(`m-${n}`))),
        );
        expect(adds.filter((r) => r === 'CREATED')).toHaveLength(1);

        const winner = `m-${adds.indexOf('CREATED') + 1}`;
        const activations = await Promise.all(
          [1, 2, 3, 4, 5].map(() => b.memberships.activate(membershipId(winner), at(7))),
        );
        expect(activations.filter(Boolean)).toHaveLength(1);
      });
    });

    describe('RoleRepository', () => {
      it('finds a catalog Role and answers null for an unknown one', async () => {
        await b.seedRole(teacher);
        const found = await b.roles.findById(roleId('teacher'));
        expect(found).toMatchObject({ code: 'TEST_TEACHER', scope: 'SCHOOL', status: 'APPROVED' });
        expect(found?.isGrantableInSchool).toBe(true);
        expect(await b.roles.findById(roleId('ghost'))).toBeNull();
      });

      it('keeps REMOVED and GLOBAL Roles readable but not grantable', async () => {
        await b.seedRole(
          Role.restore({
            ...teacher,
            roleId: 'old',
            code: 'OLD',
            scope: 'SCHOOL',
            status: 'REMOVED',
            privileged: false,
          }),
        );
        await b.seedRole(
          Role.restore({
            roleId: 'g',
            code: 'G',
            scope: 'GLOBAL',
            status: 'APPROVED',
            privileged: true,
          }),
        );
        expect((await b.roles.findById(roleId('old')))?.isGrantableInSchool).toBe(false);
        const global = await b.roles.findById(roleId('g'));
        expect(global?.isGrantableInSchool).toBe(false);
        expect(global?.privileged).toBe(true);
      });

      it('honors the actor allowlist', async () => {
        await b.seedRole(teacher, 'admin-1');
        const check = (actor: string) =>
          b.roles.isGrantableByActor(userId(actor), schoolId('school-1'), roleId('teacher'));
        expect(await check('admin-1')).toBe(true);
        expect(await check('other')).toBe(false);
      });
    });

    describe('GrantRepository', () => {
      beforeEach(async () => {
        await b.seedRole(teacher);
        await b.seedMembership(membership('m-1', 'ACTIVE'));
      });

      it('adds a Grant and answers CONFLICT while a live one exists for the pair', async () => {
        expect(await b.grants.add(grant('g-1'), T0)).toBe('CREATED');
        expect(await b.grants.add(grant('g-2'), T0)).toBe('CONFLICT');
        expect(await b.grants.add(grant('g-1'), T0)).toBe('CONFLICT');
        const live = await b.grants.findLiveByMembershipAndRole(
          membershipId('m-1'),
          roleId('teacher'),
          T0,
        );
        expect(live).toMatchObject({ id: 'g-1', grantedBy: 'admin-1', schoolId: 'school-1' });
        expect(live?.validFrom).toEqual(T0);
        expect(live?.validUntil).toBeNull();
      });

      it('lets a new cycle start after expiry or revocation and keeps the history', async () => {
        await b.grants.add(grant('g-1', { validUntil: at(1) }), T0);
        expect(
          await b.grants.findLiveByMembershipAndRole(membershipId('m-1'), roleId('teacher'), at(1)),
        ).toBeNull();
        expect(
          await b.grants.findLiveByMembershipAndRole(
            membershipId('m-1'),
            roleId('teacher'),
            at(0.5),
          ),
        ).not.toBeNull();
        expect(await b.grants.add(grant('g-2', { validFrom: at(2) }), at(2))).toBe('CREATED');
        const all = await b.grants.listByMembership(membershipId('m-1'));
        expect(all.map((g) => g.id)).toEqual(['g-1', 'g-2']);
        expect(all[0].validUntil).toEqual(at(1));
      });

      it('does not treat a revoked Grant as live', async () => {
        await b.grants.add(grant('g-1', { revokedAt: at(1) }), T0);
        expect(
          await b.grants.findLiveByMembershipAndRole(membershipId('m-1'), roleId('teacher'), T0),
        ).toBeNull();
        expect(await b.grants.add(grant('g-2'), T0)).toBe('CREATED');
      });

      it('lists only the Grants of the Membership', async () => {
        await b.seedMembership(membership('m-2', 'ACTIVE', 'user-2'));
        await b.grants.add(grant('g-1'), T0);
        await b.grants.add(grant('g-2', { membershipId: 'm-2' }), T0);
        expect((await b.grants.listByMembership(membershipId('m-2'))).map((g) => g.id)).toEqual([
          'g-2',
        ]);
        expect(await b.grants.listByMembership(membershipId('absent'))).toEqual([]);
      });

      it('never lets concurrent grants for the same pair both succeed', async () => {
        const results = await Promise.allSettled(
          [1, 2, 3].map((n) => b.grants.add(grant(`g-${n}`), T0)),
        );
        const created = results.filter((r) => r.status === 'fulfilled' && r.value === 'CREATED');
        expect(created).toHaveLength(1);
        expect(await b.grants.listByMembership(membershipId('m-1'))).toHaveLength(1);
      });
    });

    describe('PermissionRepository', () => {
      it('returns the associations of the requested Roles and nothing for none', async () => {
        await b.seedRole(teacher);
        await b.seedRole(Role.restore({ ...teacher, roleId: 'admin', code: 'ADMIN' }));
        await b.seedPermission(
          RolePermission.create({ roleId: 'teacher', permissionCode: 'class:read' }),
        );
        await b.seedPermission(
          RolePermission.create({ roleId: 'admin', permissionCode: 'school:manage' }),
        );

        const found = await b.permissions.findByRoleIds([roleId('teacher')]);
        expect(found.map((a) => [a.roleId, a.permissionCode])).toEqual([['teacher', 'class:read']]);
        expect(await b.permissions.findByRoleIds([])).toEqual([]);
        expect(await b.permissions.findByRoleIds([roleId('ghost')])).toEqual([]);
      });
    });
  });
}

repositoryContract('in-memory', inMemoryBackend);
repositoryContract('prisma (TEST_DATABASE_URL)', () => prismaBackend(prisma!), !prisma);

afterAll(async () => {
  await prisma?.$disconnect();
});

describe.skipIf(!prisma)('prisma only', () => {
  it('scopes the Role allowlist to the School', async () => {
    const b = prismaBackend(prisma!);
    await b.reset();
    await b.seedRole(teacher, 'admin-1');
    const check = (school: string) =>
      b.roles.isGrantableByActor(userId('admin-1'), schoolId(school), roleId('teacher'));
    expect(await check('school-1')).toBe(true);
    expect(await check('school-2')).toBe(false);
  });

  it('surfaces an unavailable database instead of answering permissively', async () => {
    const broken = new PrismaClient({
      datasourceUrl: 'postgresql://postgres:x@127.0.0.1:1/none?connect_timeout=1',
    });
    const b = prismaBackend(broken);
    await expect(b.memberships.findById(membershipId('m-1'))).rejects.toThrow();
    await expect(b.grants.add(grant('g-1'), T0)).rejects.toThrow();
    await broken.$disconnect();
  });
});

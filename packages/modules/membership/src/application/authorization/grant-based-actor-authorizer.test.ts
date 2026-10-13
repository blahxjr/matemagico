import { describe, expect, it } from 'vitest';
import { Grant } from '../../domain/entities/grant';
import { Role } from '../../domain/entities/role';
import { RolePermission } from '../../domain/entities/role-permission';
import { SchoolMembership } from '../../domain/entities/school-membership';
import { InMemoryGrantRepository } from '../../infrastructure/in-memory/in-memory-grant.repository';
import { InMemoryPermissionRepository } from '../../infrastructure/in-memory/in-memory-permission.repository';
import { InMemoryRoleRepository } from '../../infrastructure/in-memory/in-memory-role.repository';
import { InMemorySchoolMembershipRepository } from '../../infrastructure/in-memory/in-memory-school-membership.repository';
import { GrantBasedActorAuthorizer } from './grant-based-actor-authorizer';

const NOW = new Date('2026-10-10T12:00:00Z');
const PAST = new Date('2026-01-01T00:00:00Z');
const actor = { userId: 'admin-1' };

function setup(
  options: {
    state?: 'ACTIVE' | 'PENDING';
    roleCode?: string;
    revoked?: boolean;
    permissions?: string[];
  } = {},
) {
  const memberships = new InMemorySchoolMembershipRepository();
  const grants = new InMemoryGrantRepository();
  const roles = new InMemoryRoleRepository();
  const permissions = new InMemoryPermissionRepository();

  memberships.store.set(
    'm1',
    SchoolMembership.restore({
      membershipId: 'm1',
      userId: 'admin-1',
      schoolId: 's1',
      state: options.state ?? 'ACTIVE',
      createdAt: PAST,
      activatedAt: options.state === 'PENDING' ? null : PAST,
      revokedAt: null,
    }),
  );
  roles.roles.set(
    'r1',
    Role.restore({
      roleId: 'r1',
      code: options.roleCode ?? 'SCHOOL_ADMIN',
      scope: 'SCHOOL',
      status: 'APPROVED',
      privileged: true,
    }),
  );
  grants.store.set(
    'g1',
    Grant.restore({
      grantId: 'g1',
      membershipId: 'm1',
      roleId: 'r1',
      schoolId: 's1',
      grantedBy: 'root',
      validFrom: PAST,
      validUntil: null,
      revokedAt: options.revoked ? PAST : null,
    }),
  );
  for (const code of options.permissions ?? []) {
    permissions.associations.push(RolePermission.create({ roleId: 'r1', permissionCode: code }));
  }
  roles.allowlist.set('admin-1', new Set(['r2']));

  const authorizer = new GrantBasedActorAuthorizer({
    memberships,
    grants,
    roles,
    permissions,
    clock: { now: () => NOW },
  });
  return { authorizer, roles, grants };
}

describe('GrantBasedActorAuthorizer', () => {
  it('allows an ACTIVE SCHOOL_ADMIN to administer their School only', async () => {
    const { authorizer } = setup();
    expect(await authorizer.canAdministerSchool(actor, 's1')).toBe(true);
    expect(await authorizer.canAdministerSchool(actor, 's2')).toBe(false);
  });

  it('denies other users, missing actors and blank input', async () => {
    const { authorizer } = setup();
    expect(await authorizer.canAdministerSchool({ userId: 'other' }, 's1')).toBe(false);
    expect(await authorizer.canAdministerSchool(null as never, 's1')).toBe(false);
    expect(await authorizer.canAdministerSchool({ userId: ' ' }, 's1')).toBe(false);
    expect(await authorizer.canAdministerSchool(actor, '')).toBe(false);
  });

  it.each([
    ['PENDING membership', { state: 'PENDING' as const }],
    ['non-admin role', { roleCode: 'TEACHER' }],
    ['revoked grant', { revoked: true }],
  ])('denies with %s', async (_name, options) => {
    const { authorizer } = setup(options);
    expect(await authorizer.canAdministerSchool(actor, 's1')).toBe(false);
  });

  it('denies a removed role', async () => {
    const { authorizer, roles } = setup();
    roles.roles.set(
      'r1',
      Role.restore({
        roleId: 'r1',
        code: 'SCHOOL_ADMIN',
        scope: 'SCHOOL',
        status: 'REMOVED',
        privileged: true,
      }),
    );
    expect(await authorizer.canAdministerSchool(actor, 's1')).toBe(false);
  });

  it('requires the matching permission for CanManageSchool and CanActivateMembership', async () => {
    const none = setup();
    expect(await none.authorizer.canManageSchool(actor, 's1')).toBe(false);
    expect(await none.authorizer.canActivateMembership(actor, 's1')).toBe(false);

    const granted = setup({ permissions: ['school:update', 'membership:activate'] });
    expect(await granted.authorizer.canManageSchool(actor, 's1')).toBe(true);
    expect(await granted.authorizer.canActivateMembership(actor, 's1')).toBe(true);
  });

  it('CanGrantRole needs role:grant and the role on the actor allowlist', async () => {
    const withPermission = setup({ permissions: ['role:grant'] });
    expect(await withPermission.authorizer.canGrantRole(actor, 's1', 'r2')).toBe(true);
    expect(await withPermission.authorizer.canGrantRole(actor, 's1', 'r3')).toBe(false);
    expect(await withPermission.authorizer.canGrantRole(actor, 's1', '')).toBe(false);

    const without = setup();
    expect(await without.authorizer.canGrantRole(actor, 's1', 'r2')).toBe(false);
  });

  it('propagates infrastructure failures instead of authorizing', async () => {
    const { authorizer, grants } = setup();
    grants.failing = true;
    await expect(authorizer.canAdministerSchool(actor, 's1')).rejects.toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { Grant } from '../../domain/entities/grant';
import { Role } from '../../domain/entities/role';
import { RolePermission } from '../../domain/entities/role-permission';
import { codeOf, createHarness, NOW } from '../create-membership/test-support';

const DAY = 86_400_000;

async function granted() {
  const h = createHarness();
  const { membershipId } = await h.create();
  await h.activate(membershipId);
  await h.grantRole(membershipId);
  return { h, membershipId };
}

const putGrant = (
  h: ReturnType<typeof createHarness>,
  membershipId: string,
  overrides: Partial<Parameters<typeof Grant.restore>[0]> = {},
) => {
  const grant = Grant.restore({
    grantId: `g-${h.grants.store.size + 1}`,
    membershipId,
    roleId: 'teacher',
    schoolId: 'school-1',
    grantedBy: 'admin-1',
    validFrom: new Date(NOW.getTime() - 2 * DAY),
    ...overrides,
  });
  h.grants.store.set(grant.id, grant);
};

describe('ResolvePermissionsService', () => {
  it('RC-001 / SCT-005: derives Permissions only from the Roles of effective Grants', async () => {
    const { h, membershipId } = await granted();

    const output = await h.resolvePermissions(membershipId);

    expect(output).toEqual({
      result: 'ALLOWED',
      userId: 'user-1',
      membershipId,
      schoolId: 'school-1',
      action: 'class:read',
      permissions: ['class:create', 'class:read'],
      resolvedAt: NOW,
    });
  });

  it('denies an action the Role does not derive, without inflating privileges (SC-004)', async () => {
    const { h, membershipId } = await granted();
    expect(await codeOf(h.resolvePermissions(membershipId, { action: 'school:manage' }))).toBe(
      'SC-004',
    );
  });

  it('RC-008: a Permission that does not exist yields SC-004', async () => {
    const { h, membershipId } = await granted();
    expect(await codeOf(h.resolvePermissions(membershipId, { action: 'ghost:action' }))).toBe(
      'SC-004',
    );
    expect(await codeOf(h.resolvePermissions(membershipId, { action: ' ' }))).toBe('SC-004');
  });

  it('a Role without any Permission association yields SC-004', async () => {
    const { h, membershipId } = await granted();
    h.permissions.associations.length = 0;
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-004');
  });

  it('without any Grant the Membership has no Permission (SC-004)', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-004');
  });

  it('RC-006: an expired Grant generates no Permission (SC-004)', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);
    putGrant(h, membershipId, { validUntil: new Date(NOW.getTime() - 1) });
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-004');
    putGrant(h, membershipId, { validUntil: NOW });
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-004');
  });

  it('a Grant not yet started generates no Permission, and starts exactly at validFrom', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);
    putGrant(h, membershipId, { validFrom: new Date(NOW.getTime() + 1) });
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-004');
    putGrant(h, membershipId, { validFrom: NOW });
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('NO_ERROR');
  });

  it('RC-007: a revoked Grant generates no Permission (SC-004)', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);
    putGrant(h, membershipId, { revokedAt: new Date(NOW.getTime() - 1) });
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-004');
  });

  it('a removed or global Role contributes nothing even with a live Grant', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);
    h.roles.roles.set(
      'old',
      Role.restore({
        roleId: 'old',
        code: 'OLD',
        scope: 'SCHOOL',
        status: 'REMOVED',
        privileged: false,
      }),
    );
    h.permissions.associations.push(
      RolePermission.create({ roleId: 'old', permissionCode: 'x:y' }),
    );
    putGrant(h, membershipId, { roleId: 'old' });
    putGrant(h, membershipId, { roleId: 'global-role' });
    putGrant(h, membershipId, { roleId: 'ghost-role' });
    expect(await codeOf(h.resolvePermissions(membershipId, { action: 'x:y' }))).toBe('SC-004');
  });

  it('ignores Grants recorded for another School and Permissions of other Memberships', async () => {
    const { h, membershipId } = await granted();
    h.grants.store.clear();
    putGrant(h, membershipId, { schoolId: 'school-2' });
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-004');
    putGrant(h, 'other-membership');
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-004');
  });

  it('combines Permissions of several effective Roles of the same Membership', async () => {
    const { h, membershipId } = await granted();
    putGrant(h, membershipId, { roleId: 'school-admin' });
    const output = await h.resolvePermissions(membershipId, { action: 'school:manage' });
    expect(output.permissions).toEqual(['class:create', 'class:read', 'school:manage']);
  });

  it('SC-002: a Membership that is not ACTIVE yields no Permission', async () => {
    const { h, membershipId } = await granted();
    const stored = h.memberships.store.get(membershipId)!;
    h.memberships.store.delete(membershipId);
    h.memberships.store.set(
      membershipId,
      (await import('../../domain/entities/school-membership')).SchoolMembership.restore({
        membershipId,
        userId: stored.userId,
        schoolId: stored.schoolId,
        state: 'REVOKED',
        createdAt: NOW,
        revokedAt: NOW,
      }),
    );
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-002');
  });

  it('does not trust a candidate context that diverges from the authoritative one', async () => {
    const { h, membershipId } = await granted();
    h.schools.enabled.add('school-2');
    expect(await codeOf(h.resolvePermissions('forged-membership'))).toBe('SC-002');
    expect(
      await codeOf(
        h.resolvePermissions(membershipId, {
          context: { userId: 'user-1', schoolId: 'school-2', membershipId },
        }),
      ),
    ).toBe('SC-002');
    expect(
      await codeOf(
        h.resolvePermissions(membershipId, {
          context: { userId: 'admin-1', schoolId: 'school-1', membershipId },
        }),
      ),
    ).toBe('SC-001');
    expect(await codeOf(h.resolvePermissions(membershipId, { context: null }))).toBe('SC-002');
    expect(await codeOf(h.resolvePermissions(membershipId, { actor: null }))).toBe('SC-001');
  });

  it('SC-003: a School that became invalid denies everything', async () => {
    const { h, membershipId } = await granted();
    h.schools.enabled.delete('school-1');
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-003');
  });

  describe('RC-009 / SCT-006 fail closed → SC-005', () => {
    it.each([
      [
        'MembershipRepository',
        (h: ReturnType<typeof createHarness>) => (h.memberships.failing = true),
      ],
      ['GrantRepository', (h: ReturnType<typeof createHarness>) => (h.grants.failing = true)],
      ['RoleRepository', (h: ReturnType<typeof createHarness>) => (h.roles.failing = true)],
      [
        'PermissionRepository',
        (h: ReturnType<typeof createHarness>) => (h.permissions.failing = true),
      ],
      ['Users', (h: ReturnType<typeof createHarness>) => (h.users.failing = true)],
      ['Schools', (h: ReturnType<typeof createHarness>) => (h.schools.failing = true)],
    ])('%s unavailable', async (_name, breakIt) => {
      const { h, membershipId } = await granted();
      breakIt(h);
      expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-005');
    });
  });
});

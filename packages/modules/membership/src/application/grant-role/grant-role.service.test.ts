import { describe, expect, it } from 'vitest';
import { SchoolMembership } from '../../domain/entities/school-membership';
import { codeOf, createHarness, NOW } from '../create-membership/test-support';

async function active() {
  const h = createHarness();
  const { membershipId } = await h.create();
  await h.activate(membershipId);
  return { h, membershipId };
}

const seed = (
  h: ReturnType<typeof createHarness>,
  state: 'REVOKED',
  userId = 'user-1',
  id = 'seeded',
) => {
  h.memberships.store.set(
    id,
    SchoolMembership.restore({
      membershipId: id,
      userId,
      schoolId: 'school-1',
      state,
      createdAt: NOW,
      revokedAt: NOW,
    }),
  );
  return id;
};

describe('GrantRoleService', () => {
  it('GR-001 / MCT-004: grants a school Role to an ACTIVE Membership and emits RoleGranted', async () => {
    const { h, membershipId } = await active();

    const output = await h.grantRole(membershipId);

    expect(output).toEqual({
      grantId: 'grant-1',
      membershipId,
      roleId: 'teacher',
      schoolId: 'school-1',
      grantedBy: 'admin-1',
      validFrom: NOW,
    });
    expect(h.grants.store.size).toBe(1);
    expect(h.events.granted).toEqual([
      {
        grantId: 'grant-1',
        membershipId,
        roleId: 'teacher',
        schoolId: 'school-1',
        grantedBy: 'admin-1',
        occurredAt: NOW,
      },
    ]);
  });

  it('returns validUntil when provided and uses the School of the Membership', async () => {
    const { h, membershipId } = await active();
    const validUntil = new Date(NOW.getTime() + 86_400_000);
    const output = await h.grantRole(membershipId, { validUntil });
    expect(output).toMatchObject({ schoolId: 'school-1', validUntil });
  });

  it('GR-002: an unknown Membership yields MEM-001', async () => {
    const h = createHarness();
    expect(await codeOf(h.grantRole('ghost'))).toBe('MEM-001');
    expect(await codeOf(h.grantRole(' '))).toBe('MEM-001');
    expect(h.grants.store.size).toBe(0);
  });

  it('GR-003: a PENDING Membership does not receive a Role (MEM-001)', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-001');
    expect(h.grants.store.size).toBe(0);
  });

  it('GR-004: a REVOKED Membership does not receive a Role (MEM-001)', async () => {
    const h = createHarness();
    expect(await codeOf(h.grantRole(seed(h, 'REVOKED')))).toBe('MEM-001');
    expect(h.grants.store.size).toBe(0);
  });

  it('GR-005: an unknown Role yields MEM-004', async () => {
    const { h, membershipId } = await active();
    expect(await codeOf(h.grantRole(membershipId, { roleId: 'ghost' }))).toBe('MEM-004');
    expect(await codeOf(h.grantRole(membershipId, { roleId: ' ' }))).toBe('MEM-004');
    expect(h.grants.store.size).toBe(0);
  });

  it('GR-006: a removed Role yields MEM-004', async () => {
    const { h, membershipId } = await active();
    expect(await codeOf(h.grantRole(membershipId, { roleId: 'removed-role' }))).toBe('MEM-004');
  });

  it('rejects a global Role and a Role outside the actor allowlist with MEM-004', async () => {
    const { h, membershipId } = await active();
    expect(await codeOf(h.grantRole(membershipId, { roleId: 'global-role' }))).toBe('MEM-004');
    h.roles.allowlist.set('admin-1', new Set());
    expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-004');
    expect(h.grants.store.size).toBe(0);
  });

  it('GR-007: a duplicate live Grant for the Membership–Role pair yields MEM-004', async () => {
    const { h, membershipId } = await active();
    await h.grantRole(membershipId);
    expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-004');
    expect(h.grants.store.size).toBe(1);
    expect(h.events.granted).toHaveLength(1);
  });

  it('allows another Role for the same Membership and the same Role for another Membership', async () => {
    const { h, membershipId } = await active();
    h.users.active.add('user-2');
    const other = (await h.create({ userId: 'user-2' })).membershipId;
    await h.activate(other);
    await h.roles.allowlist.get('admin-1')!.add('teacher');
    expect(await codeOf(h.grantRole(membershipId))).toBe('NO_ERROR');
    expect(await codeOf(h.grantRole(other))).toBe('NO_ERROR');
  });

  it('rejects invalid validity with MEM-004', async () => {
    const { h, membershipId } = await active();
    expect(await codeOf(h.grantRole(membershipId, { validFrom: new Date('x') }))).toBe('MEM-004');
    expect(await codeOf(h.grantRole(membershipId, { validUntil: NOW }))).toBe('MEM-004');
    expect(
      await codeOf(h.grantRole(membershipId, { validUntil: new Date(NOW.getTime() - 1) })),
    ).toBe('MEM-004');
    expect(h.grants.store.size).toBe(0);
  });

  it('GR-008: an unauthorized actor or missing context yields MEM-005', async () => {
    const { h, membershipId } = await active();
    h.authorizer.allowed = false;
    expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-005');
    h.authorizer.allowed = true;
    expect(await codeOf(h.grantRole(membershipId, { actor: null }))).toBe('MEM-005');
    expect(await codeOf(h.grantRole(membershipId, { actor: { userId: ' ' } }))).toBe('MEM-005');
    expect(h.grants.store.size).toBe(0);
  });

  it('uses canGrantRole with the requested Role and marks the denial as an access decision', async () => {
    const { h, membershipId } = await active();
    const asked: string[] = [];
    h.authorizer.canGrantRole = async (_actor, _schoolId, roleId) => {
      asked.push(roleId);
      return false;
    };
    const error = await h.grantRole(membershipId, { roleId: 'school-admin' }).catch((e) => e);
    expect(error).toMatchObject({ code: 'MEM-005', denied: true });
    expect(asked).toEqual(['school-admin']);
    expect(h.grants.store.size).toBe(0);
  });

  it('keeps an unavailable authorizer distinct from a denial', async () => {
    const { h, membershipId } = await active();
    h.authorizer.failing = true;
    const error = await h.grantRole(membershipId).catch((e) => e);
    expect(error).toMatchObject({ code: 'MEM-005', denied: false });
  });

  it('authorizes against the School of the Membership, not another School', async () => {
    const { h, membershipId } = await active();
    const asked: string[] = [];
    h.authorizer.canGrantRole = async (_actor, schoolId) => {
      asked.push(schoolId);
      return false;
    };
    expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-005');
    expect(asked).toEqual(['school-1']);
  });

  it('does not reveal Membership state or Role validity to an unauthorized actor', async () => {
    const h = createHarness();
    h.authorizer.allowed = false;
    expect(await codeOf(h.grantRole(seed(h, 'REVOKED'), { roleId: 'ghost' }))).toBe('MEM-005');
  });

  it('denies self-elevation with MEM-005', async () => {
    const h = createHarness();
    h.users.active.add('admin-1');
    const { membershipId } = await h.create({ userId: 'admin-1' });
    await h.activate(membershipId);
    expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-005');
    expect(h.grants.store.size).toBe(0);
  });

  it('MEM-003: a School that is not enabled blocks the grant', async () => {
    const { h, membershipId } = await active();
    h.schools.enabled.delete('school-1');
    expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-003');
    h.schools.enabled.add('school-1');
    h.schools.failing = true;
    expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-003');
    expect(h.grants.store.size).toBe(0);
  });

  describe('SCHOOL_ADMIN requires a second approval', () => {
    it('is denied (MEM-004) without approval, with self approval or with approval by the target', async () => {
      const { h, membershipId } = await active();
      const roleId = 'school-admin';
      expect(await codeOf(h.grantRole(membershipId, { roleId }))).toBe('MEM-004');
      expect(
        await codeOf(
          h.grantRole(membershipId, { roleId, additionalApproval: { approverUserId: 'admin-1' } }),
        ),
      ).toBe('MEM-004');
      expect(
        await codeOf(
          h.grantRole(membershipId, { roleId, additionalApproval: { approverUserId: 'user-1' } }),
        ),
      ).toBe('MEM-004');
      expect(h.grants.store.size).toBe(0);
    });

    it('is denied when the approver cannot administer the School, and granted when valid', async () => {
      const { h, membershipId } = await active();
      const roleId = 'school-admin';
      h.authorizer.denied.add('admin-2');
      expect(
        await codeOf(
          h.grantRole(membershipId, { roleId, additionalApproval: { approverUserId: 'admin-2' } }),
        ),
      ).toBe('MEM-004');
      h.authorizer.denied.clear();
      expect(
        await codeOf(
          h.grantRole(membershipId, { roleId, additionalApproval: { approverUserId: 'admin-2' } }),
        ),
      ).toBe('NO_ERROR');
    });

    it('does not require approval for non-privileged Roles', async () => {
      const { h, membershipId } = await active();
      expect(await codeOf(h.grantRole(membershipId))).toBe('NO_ERROR');
    });
  });

  describe('GR-009 / FC: fails closed with MEM-005', () => {
    it('RoleRepository unavailable', async () => {
      const { h, membershipId } = await active();
      h.roles.failing = true;
      expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-005');
      expect(h.grants.store.size).toBe(0);
    });

    it('GrantRepository unavailable (read or write)', async () => {
      const { h, membershipId } = await active();
      h.grants.failing = true;
      expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-005');
      h.grants.failing = false;
      h.grants.add = async () => {
        throw new Error('write failed');
      };
      expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-005');
      expect(h.grants.store.size).toBe(0);
    });

    it('ActorAuthorizer unavailable', async () => {
      const { h, membershipId } = await active();
      h.authorizer.failing = true;
      expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-005');
      expect(h.grants.store.size).toBe(0);
    });

    it('SchoolMembershipRepository unavailable', async () => {
      const { h, membershipId } = await active();
      h.memberships.failing = true;
      expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-005');
    });

    it('does not report success when RoleGranted cannot be emitted', async () => {
      const { h, membershipId } = await active();
      h.events.failing = true;
      expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-005');
    });

    it('reports MEM-004 when a concurrent grant wins the pair', async () => {
      const { h, membershipId } = await active();
      h.grants.findLiveByMembershipAndRole = async () => null;
      await h.grantRole(membershipId);
      expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-004');
      expect(h.grants.store.size).toBe(1);
    });
  });
});

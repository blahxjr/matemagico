import { describe, expect, it } from 'vitest';
import { codeOf, createHarness, NOW } from '../create-membership/test-support';

describe('GrantRole integration (CP-MEM-003)', () => {
  it('CreateMembership → ActivateMembership → GrantRole persists the Grant', async () => {
    const h = createHarness();

    const created = await h.create();
    expect(created.state).toBe('PENDING');
    expect(await codeOf(h.grantRole(created.membershipId))).toBe('MEM-001');

    await h.activate(created.membershipId);
    const granted = await h.grantRole(created.membershipId);

    const stored = h.grants.store.get(granted.grantId);
    expect(stored).toMatchObject({
      membershipId: created.membershipId,
      roleId: 'teacher',
      schoolId: 'school-1',
      grantedBy: 'admin-1',
    });
    expect(stored?.validFrom).toEqual(NOW);
    expect(stored?.revokedAt).toBeNull();
    expect(stored?.isLiveAt(NOW)).toBe(true);
  });

  it('calculates no Permission and exposes none; the Membership is unchanged', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);
    const before = h.memberships.store.get(membershipId);

    const output = await h.grantRole(membershipId);

    expect(Object.keys(output).sort()).toEqual([
      'grantId',
      'grantedBy',
      'membershipId',
      'roleId',
      'schoolId',
      'validFrom',
    ]);
    expect(Object.keys(h.grants.store.get(output.grantId)!)).not.toContain('permissions');
    expect(h.memberships.store.get(membershipId)).toBe(before);
  });

  it('an expired Grant no longer blocks a new cycle for the same Role', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);
    const past = new Date(NOW.getTime() - 2 * 86_400_000);
    await h.grantRole(membershipId, {
      validFrom: past,
      validUntil: new Date(NOW.getTime() - 86_400_000),
    });

    const second = await h.grantRole(membershipId);
    expect(second.grantId).toBe('grant-2');
    expect(h.grants.store.size).toBe(2);
  });

  it('a failed grant leaves nothing behind and can be retried', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);

    h.roles.failing = true;
    expect(await codeOf(h.grantRole(membershipId))).toBe('MEM-005');
    h.roles.failing = false;
    expect(h.grants.store.size).toBe(0);

    expect(await codeOf(h.grantRole(membershipId))).toBe('NO_ERROR');
    expect(h.grants.store.size).toBe(1);
  });
});

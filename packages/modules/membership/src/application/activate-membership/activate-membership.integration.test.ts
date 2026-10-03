import { describe, expect, it } from 'vitest';
import { codeOf, createHarness } from '../create-membership/test-support';

describe('ActivateMembership integration (CP-MEM-002)', () => {
  it('CreateMembership → ActivateMembership: PENDING → ACTIVE', async () => {
    const h = createHarness();

    const created = await h.create();
    expect(created.state).toBe('PENDING');
    expect(h.memberships.store.get(created.membershipId)?.state).toBe('PENDING');

    const activated = await h.activate(created.membershipId);
    expect(activated).toMatchObject({ membershipId: created.membershipId, state: 'ACTIVE' });

    const stored = await h.memberships.findById(created.membershipId as never);
    expect(stored?.state).toBe('ACTIVE');
    expect(stored?.activatedAt).toEqual(activated.activatedAt);
    expect(stored?.revokedAt).toBeNull();
  });

  it('creates no Role, Permission or Grant and does not touch User or School', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    const usersBefore = [...h.users.active];
    const schoolsBefore = [...h.schools.enabled];

    const output = await h.activate(membershipId);

    expect(Object.keys(output).sort()).toEqual([
      'activatedAt',
      'membershipId',
      'schoolId',
      'state',
      'userId',
    ]);
    expect(h.memberships.store.size).toBe(1);
    expect([...h.users.active]).toEqual(usersBefore);
    expect([...h.schools.enabled]).toEqual(schoolsBefore);
  });

  it('an ACTIVE Membership keeps occupying the User–School pair', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);
    expect(await codeOf(h.create())).toBe('MEM-001');
  });

  it('a failed activation leaves the Membership PENDING and it can be retried', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();

    h.users.failing = true;
    expect(await codeOf(h.activate(membershipId))).toBe('MEM-002');
    h.users.failing = false;
    expect(h.memberships.store.get(membershipId)?.state).toBe('PENDING');

    expect(await codeOf(h.activate(membershipId))).toBe('NO_ERROR');
  });
});

import { describe, expect, it } from 'vitest';
import { SchoolMembership } from '../../domain/entities/school-membership';
import { codeOf, createHarness, NOW } from '../create-membership/test-support';

async function pending() {
  const h = createHarness();
  const { membershipId } = await h.create();
  return { h, membershipId };
}

const seed = (h: ReturnType<typeof createHarness>, state: 'ACTIVE' | 'REVOKED', id = 'seeded') => {
  h.memberships.store.set(
    id,
    SchoolMembership.restore({
      membershipId: id,
      userId: 'user-1',
      schoolId: 'school-1',
      state,
      createdAt: NOW,
      activatedAt: state === 'ACTIVE' ? NOW : null,
      revokedAt: state === 'REVOKED' ? NOW : null,
    }),
  );
  return id;
};

describe('ActivateMembershipService', () => {
  it('AM-001 / MCT-002: activates a PENDING Membership and emits MembershipCreated', async () => {
    const { h, membershipId } = await pending();

    const output = await h.activate(membershipId);

    expect(output).toEqual({
      membershipId,
      userId: 'user-1',
      schoolId: 'school-1',
      state: 'ACTIVE',
      activatedAt: NOW,
    });
    expect(h.memberships.store.get(membershipId)).toMatchObject({
      state: 'ACTIVE',
      activatedAt: NOW,
    });
    expect(h.events.published).toEqual([
      { membershipId, userId: 'user-1', schoolId: 'school-1', occurredAt: NOW },
    ]);
  });

  it('AM-002: an unknown Membership yields MEM-001', async () => {
    const h = createHarness();
    expect(await codeOf(h.activate('ghost'))).toBe('MEM-001');
    expect(await codeOf(h.activate(' '))).toBe('MEM-001');
    expect(h.events.published).toHaveLength(0);
  });

  it('AM-003: an ACTIVE Membership is not activated again (MEM-001, activatedAt unchanged)', async () => {
    const { h, membershipId } = await pending();
    await h.activate(membershipId);
    expect(await codeOf(h.activate(membershipId))).toBe('MEM-001');
    expect(h.events.published).toHaveLength(1);
  });

  it('AM-004: a REVOKED Membership is never reactivated (MEM-001)', async () => {
    const h = createHarness();
    const id = seed(h, 'REVOKED');
    expect(await codeOf(h.activate(id))).toBe('MEM-001');
    expect(h.memberships.store.get(id)?.state).toBe('REVOKED');
    expect(h.events.published).toHaveLength(0);
  });

  it('AM-005: an invalid User blocks activation with MEM-002', async () => {
    const { h, membershipId } = await pending();
    h.users.active.delete('user-1');
    expect(await codeOf(h.activate(membershipId))).toBe('MEM-002');
    expect(h.memberships.store.get(membershipId)?.state).toBe('PENDING');
  });

  it('AM-006: an invalid School blocks activation with MEM-003', async () => {
    const { h, membershipId } = await pending();
    h.schools.enabled.delete('school-1');
    expect(await codeOf(h.activate(membershipId))).toBe('MEM-003');
    expect(h.memberships.store.get(membershipId)?.state).toBe('PENDING');
  });

  it('AM-007: an unauthorized actor or missing context yields MEM-005', async () => {
    const { h, membershipId } = await pending();
    h.authorizer.allowed = false;
    expect(await codeOf(h.activate(membershipId))).toBe('MEM-005');
    h.authorizer.allowed = true;
    expect(await codeOf(h.activate(membershipId, null))).toBe('MEM-005');
    expect(await codeOf(h.activate(membershipId, { userId: ' ' }))).toBe('MEM-005');
    expect(h.memberships.store.get(membershipId)?.state).toBe('PENDING');
  });

  it('marks a denial as an access decision, distinct from an unavailable authorizer', async () => {
    const { h, membershipId } = await pending();
    h.authorizer.canActivateMembership = async () => false;
    expect(await h.activate(membershipId).catch((e) => e)).toMatchObject({
      code: 'MEM-005',
      denied: true,
    });
    h.authorizer.canActivateMembership = async () => {
      throw new Error('down');
    };
    expect(await h.activate(membershipId).catch((e) => e)).toMatchObject({
      code: 'MEM-005',
      denied: false,
    });
  });

  it('authorizes against the School of the Membership, not another School', async () => {
    const { h, membershipId } = await pending();
    const asked: string[] = [];
    h.authorizer.canActivateMembership = async (_actor, schoolId) => {
      asked.push(schoolId);
      return schoolId === 'other-school';
    };
    expect(await codeOf(h.activate(membershipId))).toBe('MEM-005');
    expect(asked).toEqual(['school-1']);
  });

  it('does not reveal the Membership state to an unauthorized actor', async () => {
    const h = createHarness();
    const id = seed(h, 'REVOKED');
    h.authorizer.allowed = false;
    expect(await codeOf(h.activate(id))).toBe('MEM-005');
  });

  it('reports MEM-001 when a concurrent activation wins the transition', async () => {
    const { h, membershipId } = await pending();
    h.memberships.activate = async () => false;
    expect(await codeOf(h.activate(membershipId))).toBe('MEM-001');
    expect(h.events.published).toHaveLength(0);
  });

  describe('AM-008 / FC: fails closed', () => {
    it('FC-001: Users unavailable → MEM-002 (contract: failure validating User)', async () => {
      const { h, membershipId } = await pending();
      h.users.failing = true;
      expect(await codeOf(h.activate(membershipId))).toBe('MEM-002');
      expect(h.memberships.store.get(membershipId)?.state).toBe('PENDING');
    });

    it('FC-002: Schools unavailable → MEM-003 (contract: failure validating School)', async () => {
      const { h, membershipId } = await pending();
      h.schools.failing = true;
      expect(await codeOf(h.activate(membershipId))).toBe('MEM-003');
      expect(h.memberships.store.get(membershipId)?.state).toBe('PENDING');
    });

    it('FC-003: ActorAuthorizer unavailable → MEM-005', async () => {
      const { h, membershipId } = await pending();
      h.authorizer.failing = true;
      expect(await codeOf(h.activate(membershipId))).toBe('MEM-005');
      expect(h.memberships.store.get(membershipId)?.state).toBe('PENDING');
    });

    it('FC-004: repository unavailable (read or write) → MEM-005', async () => {
      const { h, membershipId } = await pending();
      h.memberships.failing = true;
      expect(await codeOf(h.activate(membershipId))).toBe('MEM-005');
      h.memberships.failing = false;

      h.memberships.activate = async () => {
        throw new Error('write failed');
      };
      expect(await codeOf(h.activate(membershipId))).toBe('MEM-005');
      expect(h.memberships.store.get(membershipId)?.state).toBe('PENDING');
    });

    it('does not report success when the MembershipCreated event cannot be emitted', async () => {
      const { h, membershipId } = await pending();
      h.events.failing = true;
      expect(await codeOf(h.activate(membershipId))).toBe('MEM-005');
    });
  });
});

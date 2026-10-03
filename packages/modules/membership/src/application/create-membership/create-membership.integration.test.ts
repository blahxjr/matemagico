import { describe, expect, it } from 'vitest';
import { SchoolMembership } from '../../domain/entities/school-membership';
import { codeOf, createHarness } from './test-support';

describe('CreateMembership integration (CP-MEM-001)', () => {
  it('persists a PENDING Membership retrievable through the repository', async () => {
    const h = createHarness();
    const { membershipId, userId, schoolId } = await h.create();

    const stored = await h.memberships.findById(membershipId as never);
    expect(stored).toMatchObject({ id: membershipId, userId, schoolId, state: 'PENDING' });
    expect(stored?.isOpen).toBe(true);
  });

  it('a PENDING Membership is not ACTIVE: the pair stays occupied until it is revoked', async () => {
    const h = createHarness();
    await h.create();
    expect(await codeOf(h.create())).toBe('MEM-001');
  });

  it('a REVOKED cycle no longer blocks a new Membership for the pair', async () => {
    const h = createHarness();
    const first = await h.create();
    const stored = h.memberships.store.get(first.membershipId)!;
    h.memberships.store.set(
      first.membershipId,
      SchoolMembership.restore({
        membershipId: stored.id,
        userId: stored.userId,
        schoolId: stored.schoolId,
        state: 'REVOKED',
        createdAt: stored.createdAt,
        revokedAt: new Date('2026-02-01T00:00:00.000Z'),
      }),
    );

    const second = await h.create();
    expect(second.membershipId).not.toBe(first.membershipId);
    expect(second.state).toBe('PENDING');
    expect(h.memberships.store.size).toBe(2);
  });

  it('a failed persistence never reports success and leaves no Membership behind', async () => {
    const h = createHarness();
    h.memberships.failing = true;
    expect(await codeOf(h.create())).toBe('MEM-005');
    h.memberships.failing = false;
    expect(h.memberships.store.size).toBe(0);
    expect(await codeOf(h.create())).toBe('NO_ERROR');
  });

  it('keeps Memberships of different Schools independent for the same User', async () => {
    const h = createHarness();
    h.schools.enabled.add('school-2');
    const a = await h.create();
    const b = await h.create({ schoolId: 'school-2' });
    expect([a.schoolId, b.schoolId]).toEqual(['school-1', 'school-2']);
  });
});

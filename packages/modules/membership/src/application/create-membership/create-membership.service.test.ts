import { describe, expect, it } from 'vitest';
import { codeOf, createHarness, NOW } from './test-support';

describe('CreateMembershipService', () => {
  it('CM-001 / MAT-001: creates a PENDING Membership with canonical references', async () => {
    const h = createHarness();

    const output = await h.create();

    expect(output).toEqual({
      membershipId: 'membership-1',
      userId: 'user-1',
      schoolId: 'school-1',
      state: 'PENDING',
    });
    const stored = [...h.memberships.store.values()];
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ state: 'PENDING', activatedAt: null, revokedAt: null });
    expect(stored[0].createdAt).toEqual(NOW);
  });

  it('does not create Roles, Grants or Permissions and exposes no such data', async () => {
    const h = createHarness();
    const output = await h.create();
    expect(Object.keys(output).sort()).toEqual(['membershipId', 'schoolId', 'state', 'userId']);
    expect(h.grants.store.size).toBe(0);
  });

  it('CM-002: an unknown or inactive User yields MEM-002 and creates nothing', async () => {
    const h = createHarness();
    expect(await codeOf(h.create({ userId: 'ghost' }))).toBe('MEM-002');
    expect(h.memberships.store.size).toBe(0);
  });

  it('CM-003: an unknown or disabled School yields MEM-003 and creates nothing', async () => {
    const h = createHarness();
    h.authorizer.allowed = true;
    expect(await codeOf(h.create({ schoolId: 'ghost' }))).toBe('MEM-003');
    expect(h.memberships.store.size).toBe(0);
  });

  it('CM-004: a duplicate open Membership for the pair yields MEM-001', async () => {
    const h = createHarness();
    await h.create();
    expect(await codeOf(h.create())).toBe('MEM-001');
    expect(h.memberships.store.size).toBe(1);
  });

  it('allows a different School or a different User for the same counterpart', async () => {
    const h = createHarness();
    h.users.active.add('user-2');
    h.schools.enabled.add('school-2');
    await h.create();
    expect(await codeOf(h.create({ userId: 'user-2' }))).toBe('NO_ERROR');
    expect(await codeOf(h.create({ schoolId: 'school-2' }))).toBe('NO_ERROR');
    expect(h.memberships.store.size).toBe(3);
  });

  it('reports MEM-001 when the repository loses a concurrent creation race', async () => {
    const h = createHarness();
    h.memberships.findOpenByUserAndSchool = async () => null;
    await h.create();
    expect(await codeOf(h.create())).toBe('MEM-001');
    expect(h.memberships.store.size).toBe(1);
  });

  it('MEM-005: an unauthorized actor or missing context is denied before anything else is revealed', async () => {
    const h = createHarness();
    h.authorizer.allowed = false;
    expect(await codeOf(h.create({ userId: 'ghost', schoolId: 'ghost' }))).toBe('MEM-005');
    h.authorizer.allowed = true;
    expect(await codeOf(h.create({ actor: null }))).toBe('MEM-005');
    expect(await codeOf(h.create({ actor: { userId: ' ' } }))).toBe('MEM-005');
    expect(h.memberships.store.size).toBe(0);
  });

  it('rejects blank identifiers with the code of the missing reference', async () => {
    const h = createHarness();
    expect(await codeOf(h.create({ userId: '' }))).toBe('MEM-002');
    expect(await codeOf(h.create({ schoolId: '  ' }))).toBe('MEM-003');
    expect(h.memberships.store.size).toBe(0);
  });

  it('CM-005: fails closed, mapping each unavailable dependency to its contractual code', async () => {
    const h = createHarness();

    h.authorizer.failing = true;
    expect(await codeOf(h.create())).toBe('MEM-005');
    h.authorizer.failing = false;

    h.users.failing = true;
    expect(await codeOf(h.create())).toBe('MEM-002');
    h.users.failing = false;

    h.schools.failing = true;
    expect(await codeOf(h.create())).toBe('MEM-003');
    h.schools.failing = false;

    h.memberships.failing = true;
    expect(await codeOf(h.create())).toBe('MEM-005');
    h.memberships.failing = false;

    expect(h.memberships.store.size).toBe(0);
  });
});

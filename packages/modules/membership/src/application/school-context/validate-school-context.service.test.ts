import { describe, expect, it } from 'vitest';
import { SchoolMembership } from '../../domain/entities/school-membership';
import { codeOf, createHarness, NOW } from '../create-membership/test-support';

const seed = (
  h: ReturnType<typeof createHarness>,
  state: 'PENDING' | 'ACTIVE' | 'REVOKED',
  schoolId = 'school-1',
  userId = 'user-1',
) =>
  h.memberships.store.set(
    'm-1',
    SchoolMembership.restore({
      membershipId: 'm-1',
      userId,
      schoolId,
      state,
      createdAt: NOW,
      activatedAt: state === 'ACTIVE' ? NOW : null,
      revokedAt: state === 'REVOKED' ? NOW : null,
    }),
  );

describe('ValidateSchoolContextService', () => {
  it('VC-001: a context that is still usable is VALID', async () => {
    const h = createHarness();
    seed(h, 'ACTIVE');
    expect(await h.validateSchoolContext('m-1')).toEqual({
      result: 'VALID',
      userId: 'user-1',
      schoolId: 'school-1',
      membershipId: 'm-1',
    });
  });

  it('VC-002: a removed User yields SC-001', async () => {
    const h = createHarness();
    seed(h, 'ACTIVE');
    h.users.active.delete('user-1');
    expect(await codeOf(h.validateSchoolContext('m-1'))).toBe('SC-001');
  });

  it('a missing actor yields SC-001', async () => {
    const h = createHarness();
    seed(h, 'ACTIVE');
    expect(await codeOf(h.validateSchoolContext('m-1', { actor: null }))).toBe('SC-001');
  });

  it('VC-003: a missing Membership yields SC-002', async () => {
    const h = createHarness();
    expect(await codeOf(h.validateSchoolContext('absent'))).toBe('SC-002');
  });

  it('VC-004: a PENDING Membership yields SC-002', async () => {
    const h = createHarness();
    seed(h, 'PENDING');
    expect(await codeOf(h.validateSchoolContext('m-1'))).toBe('SC-002');
  });

  it('VC-005: a REVOKED Membership yields SC-002', async () => {
    const h = createHarness();
    seed(h, 'REVOKED');
    expect(await codeOf(h.validateSchoolContext('m-1'))).toBe('SC-002');
  });

  it('VC-006: a removed School yields SC-003', async () => {
    const h = createHarness();
    seed(h, 'ACTIVE');
    h.schools.enabled.delete('school-1');
    expect(await codeOf(h.validateSchoolContext('m-1'))).toBe('SC-003');
  });

  it('VC-007: a disabled School yields SC-003', async () => {
    const h = createHarness();
    seed(h, 'ACTIVE');
    h.schools.enabled.clear();
    expect(await codeOf(h.validateSchoolContext('m-1'))).toBe('SC-003');
  });

  it('a context whose School differs from the Membership School yields SC-003', async () => {
    const h = createHarness();
    h.schools.enabled.add('school-2');
    seed(h, 'ACTIVE', 'school-1');
    const result = h.validateSchoolContext('m-1', {
      context: { userId: 'user-1', schoolId: 'school-2', membershipId: 'm-1' },
    });
    expect(await codeOf(result)).toBe('SC-003');
  });

  it('a resource of another School yields SC-003; the same School stays VALID', async () => {
    const h = createHarness();
    seed(h, 'ACTIVE');
    expect(await codeOf(h.validateSchoolContext('m-1', { resourceSchoolId: 'school-2' }))).toBe(
      'SC-003',
    );
    expect(await h.validateSchoolContext('m-1', { resourceSchoolId: 'school-1' })).toMatchObject({
      result: 'VALID',
    });
  });

  it('a context of another User is not transferable (SC-002)', async () => {
    const h = createHarness();
    h.users.active.add('user-2');
    seed(h, 'ACTIVE');
    const result = h.validateSchoolContext('m-1', { actor: { userId: 'user-2' } });
    expect(await codeOf(result)).toBe('SC-002');
  });

  it('a Membership owned by another User yields SC-002', async () => {
    const h = createHarness();
    seed(h, 'ACTIVE', 'school-1', 'user-2');
    expect(await codeOf(h.validateSchoolContext('m-1'))).toBe('SC-002');
  });

  it('malformed context yields a closed denial', async () => {
    const h = createHarness();
    expect(await codeOf(h.validateSchoolContext('m-1', { context: null }))).toBe('SC-002');
    const noSchool = { userId: 'user-1', schoolId: '', membershipId: 'm-1' };
    expect(await codeOf(h.validateSchoolContext('m-1', { context: noSchool }))).toBe('SC-003');
  });

  it('never consults Grants, Roles or Permissions', async () => {
    const h = createHarness();
    seed(h, 'ACTIVE');
    h.grants.failing = true;
    h.roles.failing = true;
    h.permissions.failing = true;
    expect(await h.validateSchoolContext('m-1')).toMatchObject({ result: 'VALID' });
  });

  it('VC-008 / SCT-006: unavailable dependencies yield SC-005', async () => {
    const targets = ['users', 'schools', 'memberships'] as const;
    for (const target of targets) {
      const h = createHarness();
      seed(h, 'ACTIVE');
      h[target].failing = true;
      expect(await codeOf(h.validateSchoolContext('m-1'))).toBe('SC-005');
    }
  });

  it('does not change state', async () => {
    const h = createHarness();
    seed(h, 'ACTIVE');
    const before = [...h.memberships.store.values()];
    await h.validateSchoolContext('m-1');
    expect([...h.memberships.store.values()]).toEqual(before);
    expect(h.grants.store.size).toBe(0);
  });
});

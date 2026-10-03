import { describe, expect, it } from 'vitest';
import { SchoolMembership } from '../../domain/entities/school-membership';
import { codeOf, createHarness, NOW } from '../create-membership/test-support';

const flow = async () => {
  const h = createHarness();
  const { membershipId } = await h.create();
  await h.activate(membershipId);
  await h.grantRole(membershipId);
  const context = await h.resolveSchoolContext();
  return { h, membershipId, context };
};

describe('Validate School Context integration (CP-SC-002)', () => {
  it('CreateMembership → ActivateMembership → GrantRole → ResolveSchoolContext → ValidateSchoolContext', async () => {
    const { h, membershipId, context } = await flow();
    const before = h.grants.store.size;

    expect(await h.validateSchoolContext(membershipId, { context })).toMatchObject({
      result: 'VALID',
      membershipId,
      schoolId: 'school-1',
    });
    expect(await h.validateSchoolContext(membershipId, { context })).toMatchObject({
      result: 'VALID',
    });
    expect(h.grants.store.size).toBe(before);
  });

  it('Membership revoked after resolution invalidates the context (SC-002)', async () => {
    const { h, membershipId, context } = await flow();
    h.memberships.store.set(
      membershipId,
      SchoolMembership.restore({
        membershipId,
        userId: 'user-1',
        schoolId: 'school-1',
        state: 'REVOKED',
        createdAt: NOW,
        activatedAt: NOW,
        revokedAt: NOW,
      }),
    );
    expect(await codeOf(h.validateSchoolContext(membershipId, { context }))).toBe('SC-002');
  });

  it('School removed after resolution invalidates the context (SC-003)', async () => {
    const { h, membershipId, context } = await flow();
    h.schools.enabled.delete('school-1');
    expect(await codeOf(h.validateSchoolContext(membershipId, { context }))).toBe('SC-003');
  });

  it('User removed after resolution invalidates the context (SC-001)', async () => {
    const { h, membershipId, context } = await flow();
    h.users.active.delete('user-1');
    expect(await codeOf(h.validateSchoolContext(membershipId, { context }))).toBe('SC-001');
  });
});

import { describe, expect, it } from 'vitest';
import { codeOf, createHarness } from '../create-membership/test-support';

describe('School Context integration (CP-SC-001)', () => {
  it('CreateMembership → ActivateMembership → GrantRole → ResolveSchoolContext → ResolvePermissions', async () => {
    const h = createHarness();

    const created = await h.create();
    expect(await codeOf(h.resolveSchoolContext())).toBe('SC-002');

    await h.activate(created.membershipId);
    const context = await h.resolveSchoolContext();
    expect(context).toMatchObject({
      result: 'CONTEXT_RESOLVED',
      membershipId: created.membershipId,
      schoolId: 'school-1',
      userId: 'user-1',
    });
    // Before any Grant the context exists but authorizes nothing.
    expect(await codeOf(h.resolvePermissions(context.membershipId))).toBe('SC-004');

    await h.grantRole(created.membershipId);
    const resolved = await h.resolvePermissions(context.membershipId, { action: 'class:create' });

    expect(resolved).toMatchObject({
      result: 'ALLOWED',
      membershipId: created.membershipId,
      schoolId: 'school-1',
      permissions: ['class:create', 'class:read'],
    });
  });

  it('context switch: another School is resolved from scratch and carries no Permission over', async () => {
    const h = createHarness();
    h.schools.enabled.add('school-2');
    const a = await h.create();
    await h.activate(a.membershipId);
    await h.grantRole(a.membershipId);
    const b = await h.create({ schoolId: 'school-2' });
    await h.activate(b.membershipId);

    const ctxB = await h.resolveSchoolContext({ schoolId: 'school-2' });
    expect(ctxB.membershipId).toBe(b.membershipId);
    expect(
      await codeOf(
        h.resolvePermissions(b.membershipId, {
          context: { userId: 'user-1', schoolId: 'school-2', membershipId: b.membershipId },
        }),
      ),
    ).toBe('SC-004');
    expect(await codeOf(h.resolvePermissions(a.membershipId))).toBe('NO_ERROR');
  });

  it('Grants stop authorizing as soon as the Grant expires', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);
    // Valid window entirely in the past relative to the fixed clock.
    await h.grantRole(membershipId, {
      validFrom: new Date('2025-12-01T00:00:00.000Z'),
      validUntil: new Date('2025-12-31T00:00:00.000Z'),
    });
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-004');
  });

  it('a failed dependency never yields a permissive answer and recovers afterwards', async () => {
    const h = createHarness();
    const { membershipId } = await h.create();
    await h.activate(membershipId);
    await h.grantRole(membershipId);

    h.grants.failing = true;
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('SC-005');
    h.grants.failing = false;
    expect(await codeOf(h.resolvePermissions(membershipId))).toBe('NO_ERROR');
  });
});

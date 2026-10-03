import { describe, expect, it } from 'vitest';
import { SchoolMembership } from '../../domain/entities/school-membership';
import { codeOf, createHarness, NOW } from '../create-membership/test-support';

async function active() {
  const h = createHarness();
  const { membershipId } = await h.create();
  await h.activate(membershipId);
  return { h, membershipId };
}

const seedMembership = (
  h: ReturnType<typeof createHarness>,
  id: string,
  state: 'PENDING' | 'ACTIVE' | 'REVOKED',
  userId = 'user-1',
  schoolId = 'school-1',
) =>
  h.memberships.store.set(
    id,
    SchoolMembership.restore({
      membershipId: id,
      userId,
      schoolId,
      state,
      createdAt: NOW,
      activatedAt: state === 'ACTIVE' ? NOW : null,
      revokedAt: state === 'REVOKED' ? NOW : null,
    }),
  );

describe('ResolveSchoolContextService', () => {
  it('RC-001 / SCT-001: an ACTIVE Membership resolves the canonical context without Permissions', async () => {
    const { h, membershipId } = await active();

    const output = await h.resolveSchoolContext();

    expect(output).toEqual({
      result: 'CONTEXT_RESOLVED',
      userId: 'user-1',
      schoolId: 'school-1',
      membershipId,
      resolvedAt: NOW,
    });
    expect(Object.keys(output)).not.toContain('permissions');
  });

  it('resolves even without Grants: the context authorizes nothing by itself', async () => {
    const { h } = await active();
    await expect(h.resolveSchoolContext()).resolves.toMatchObject({ result: 'CONTEXT_RESOLVED' });
    expect(h.grants.store.size).toBe(0);
  });

  it('RC-002 / SCT-002: no Membership yields SC-002 and creates none', async () => {
    const h = createHarness();
    expect(await codeOf(h.resolveSchoolContext())).toBe('SC-002');
    expect(h.memberships.store.size).toBe(0);
  });

  it('RC-003: a PENDING Membership yields SC-002', async () => {
    const h = createHarness();
    await h.create();
    expect(await codeOf(h.resolveSchoolContext())).toBe('SC-002');
  });

  it('RC-004: a REVOKED Membership yields SC-002', async () => {
    const h = createHarness();
    seedMembership(h, 'm-revoked', 'REVOKED');
    expect(await codeOf(h.resolveSchoolContext())).toBe('SC-002');
  });

  it('does not use another User or another School as fallback (SC-002)', async () => {
    const { h } = await active();
    h.users.active.add('user-2');
    h.schools.enabled.add('school-2');
    expect(await codeOf(h.resolveSchoolContext({ actor: { userId: 'user-2' } }))).toBe('SC-002');
    expect(await codeOf(h.resolveSchoolContext({ schoolId: 'school-2' }))).toBe('SC-002');
  });

  it('keeps contexts of different Schools independent for the same User', async () => {
    const { h, membershipId } = await active();
    h.schools.enabled.add('school-2');
    seedMembership(h, 'm-2', 'ACTIVE', 'user-1', 'school-2');
    expect(await h.resolveSchoolContext()).toMatchObject({ membershipId, schoolId: 'school-1' });
    expect(await h.resolveSchoolContext({ schoolId: 'school-2' })).toMatchObject({
      membershipId: 'm-2',
      schoolId: 'school-2',
    });
  });

  it('denies an inconsistent duplicate ACTIVE Membership for the pair (SC-002)', async () => {
    const { h } = await active();
    seedMembership(h, 'm-dup', 'ACTIVE');
    expect(await codeOf(h.resolveSchoolContext())).toBe('SC-002');
  });

  it('a REVOKED cycle next to the single ACTIVE one does not interfere', async () => {
    const { h, membershipId } = await active();
    seedMembership(h, 'm-old', 'REVOKED');
    expect(await h.resolveSchoolContext()).toMatchObject({ membershipId });
  });

  it('RC-005 / SCT-004: an invalid School yields SC-003', async () => {
    const { h } = await active();
    h.schools.enabled.delete('school-1');
    expect(await codeOf(h.resolveSchoolContext())).toBe('SC-003');
    expect(await codeOf(h.resolveSchoolContext({ schoolId: 'ghost' }))).toBe('SC-003');
    expect(await codeOf(h.resolveSchoolContext({ schoolId: ' ' }))).toBe('SC-003');
  });

  it('missing authenticated context or inactive User yields SC-001', async () => {
    const { h } = await active();
    expect(await codeOf(h.resolveSchoolContext({ actor: null }))).toBe('SC-001');
    expect(await codeOf(h.resolveSchoolContext({ actor: { userId: ' ' } }))).toBe('SC-001');
    h.users.active.delete('user-1');
    expect(await codeOf(h.resolveSchoolContext())).toBe('SC-001');
  });

  it('RC-009 / SCT-006: dependencies unavailable yield SC-005', async () => {
    const { h } = await active();

    h.users.failing = true;
    expect(await codeOf(h.resolveSchoolContext())).toBe('SC-005');
    h.users.failing = false;

    h.schools.failing = true;
    expect(await codeOf(h.resolveSchoolContext())).toBe('SC-005');
    h.schools.failing = false;

    h.memberships.failing = true;
    expect(await codeOf(h.resolveSchoolContext())).toBe('SC-005');
    h.memberships.failing = false;

    expect(await codeOf(h.resolveSchoolContext())).toBe('NO_ERROR');
  });
});

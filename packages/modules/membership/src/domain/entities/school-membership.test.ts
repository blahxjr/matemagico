import { describe, expect, it } from 'vitest';
import { MembershipDomainError } from '../errors/membership-domain-error';
import { SchoolMembership } from './school-membership';

const base = {
  membershipId: 'm-1',
  userId: 'u-1',
  schoolId: 's-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('SchoolMembership', () => {
  it('is created PENDING and open, never ACTIVE', () => {
    const membership = SchoolMembership.create(base);
    expect(membership.state).toBe('PENDING');
    expect(membership.isOpen).toBe(true);
    expect(membership.activatedAt).toBeNull();
    expect(membership.revokedAt).toBeNull();
  });

  it('rejects blank identifiers and invalid dates', () => {
    expect(() => SchoolMembership.create({ ...base, userId: ' ' })).toThrow(MembershipDomainError);
    expect(() => SchoolMembership.create({ ...base, schoolId: '' })).toThrow(MembershipDomainError);
    expect(() => SchoolMembership.create({ ...base, createdAt: new Date('x') })).toThrow(
      MembershipDomainError,
    );
  });

  it('restores only consistent lifecycle snapshots', () => {
    expect(() => SchoolMembership.restore({ ...base, state: 'ACTIVE' })).toThrow(
      MembershipDomainError,
    );
    expect(() => SchoolMembership.restore({ ...base, state: 'REVOKED' })).toThrow(
      MembershipDomainError,
    );
    expect(() =>
      SchoolMembership.restore({ ...base, state: 'PENDING', activatedAt: new Date() }),
    ).toThrow(MembershipDomainError);
    const revoked = SchoolMembership.restore({ ...base, state: 'REVOKED', revokedAt: new Date() });
    expect(revoked.isOpen).toBe(false);
  });

  it('activates only from PENDING and never reactivates ACTIVE or REVOKED', () => {
    const at = new Date('2026-01-02T00:00:00.000Z');
    const active = SchoolMembership.create(base).activate(at);
    expect(active.state).toBe('ACTIVE');
    expect(active.activatedAt).toEqual(at);
    expect(active.createdAt).toEqual(base.createdAt);
    expect(() => active.activate(at)).toThrow(MembershipDomainError);
    const revoked = SchoolMembership.restore({ ...base, state: 'REVOKED', revokedAt: at });
    expect(() => revoked.activate(at)).toThrow(MembershipDomainError);
  });

  it('returns defensive copies of timestamps', () => {
    const membership = SchoolMembership.create(base);
    membership.createdAt.setFullYear(1999);
    expect(membership.createdAt).toEqual(base.createdAt);
  });
});

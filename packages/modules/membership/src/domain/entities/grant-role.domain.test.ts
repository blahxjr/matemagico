import { describe, expect, it } from 'vitest';
import { MembershipDomainError } from '../errors/membership-domain-error';
import { Grant } from './grant';
import { Role } from './role';

const base = {
  grantId: 'g-1',
  membershipId: 'm-1',
  roleId: 'r-1',
  schoolId: 's-1',
  grantedBy: 'a-1',
  validFrom: new Date('2026-01-01T00:00:00.000Z'),
};

describe('Grant', () => {
  it('has inclusive validFrom, optional exclusive validUntil and no Permission', () => {
    const until = new Date('2026-02-01T00:00:00.000Z');
    const grant = Grant.create({ ...base, validUntil: until });
    expect(grant.isLiveAt(base.validFrom)).toBe(true);
    expect(grant.isLiveAt(new Date(until.getTime() - 1))).toBe(true);
    expect(grant.isLiveAt(until)).toBe(false);
    expect(Grant.create(base).isLiveAt(new Date('2099-01-01'))).toBe(true);
  });

  it('is not live once revoked, and rejects inconsistent validity', () => {
    expect(Grant.restore({ ...base, revokedAt: new Date() }).isLiveAt(base.validFrom)).toBe(false);
    expect(() => Grant.create({ ...base, validUntil: base.validFrom })).toThrow(
      MembershipDomainError,
    );
    expect(() => Grant.create({ ...base, validFrom: new Date('x') })).toThrow(
      MembershipDomainError,
    );
    expect(() => Grant.create({ ...base, grantedBy: ' ' })).toThrow(MembershipDomainError);
  });

  it('returns defensive copies of timestamps', () => {
    const grant = Grant.create(base);
    grant.validFrom.setFullYear(1999);
    expect(grant.validFrom).toEqual(base.validFrom);
  });
});

describe('Role', () => {
  const role = (scope: 'SCHOOL' | 'GLOBAL', status: 'APPROVED' | 'REMOVED') =>
    Role.restore({ roleId: 'r', code: 'R', scope, status, privileged: false });

  it('is grantable only when school-scoped and approved', () => {
    expect(role('SCHOOL', 'APPROVED').isGrantableInSchool).toBe(true);
    expect(role('SCHOOL', 'REMOVED').isGrantableInSchool).toBe(false);
    expect(role('GLOBAL', 'APPROVED').isGrantableInSchool).toBe(false);
  });

  it('rejects blank code and unknown scope', () => {
    expect(() =>
      Role.restore({
        roleId: 'r',
        code: ' ',
        scope: 'SCHOOL',
        status: 'APPROVED',
        privileged: false,
      }),
    ).toThrow(MembershipDomainError);
    expect(() =>
      Role.restore({
        roleId: 'r',
        code: 'R',
        scope: 'X' as never,
        status: 'APPROVED',
        privileged: false,
      }),
    ).toThrow(MembershipDomainError);
  });
});

import { MembershipDomainError } from '../errors/membership-domain-error';
import {
  grantId,
  membershipId,
  roleId,
  schoolId,
  userId,
  type GrantId,
  type MembershipId,
  type RoleId,
  type SchoolId,
  type UserId,
} from '../value-objects/identifiers';

export interface GrantSnapshot {
  readonly grantId: string;
  readonly membershipId: string;
  readonly roleId: string;
  readonly schoolId: string;
  readonly grantedBy: string;
  readonly validFrom: Date;
  readonly validUntil?: Date | null;
  readonly revokedAt?: Date | null;
}

/** One cycle of the Membership–Role relation. It carries no Permission; those derive from the Role. */
export class Grant {
  private constructor(
    readonly id: GrantId,
    readonly membershipId: MembershipId,
    readonly roleId: RoleId,
    readonly schoolId: SchoolId,
    readonly grantedBy: UserId,
    private readonly validFromValue: Date,
    private readonly validUntilValue: Date | null,
    private readonly revokedAtValue: Date | null,
  ) {}

  static create(input: Omit<GrantSnapshot, 'revokedAt'>): Grant {
    return Grant.restore(input);
  }

  static restore(snapshot: GrantSnapshot): Grant {
    const validUntil = snapshot.validUntil ?? null;
    if (Number.isNaN(snapshot.validFrom?.getTime())) {
      throw new MembershipDomainError('validFrom must be a valid date.');
    }
    if (validUntil && (Number.isNaN(validUntil.getTime()) || validUntil <= snapshot.validFrom)) {
      throw new MembershipDomainError('validUntil must be after validFrom.');
    }
    return new Grant(
      grantId(snapshot.grantId),
      membershipId(snapshot.membershipId),
      roleId(snapshot.roleId),
      schoolId(snapshot.schoolId),
      userId(snapshot.grantedBy),
      new Date(snapshot.validFrom),
      validUntil && new Date(validUntil),
      snapshot.revokedAt ? new Date(snapshot.revokedAt) : null,
    );
  }

  get validFrom(): Date {
    return new Date(this.validFromValue);
  }

  get validUntil(): Date | null {
    return this.validUntilValue && new Date(this.validUntilValue);
  }

  get revokedAt(): Date | null {
    return this.revokedAtValue && new Date(this.revokedAtValue);
  }

  /** Effective for authorization: started (validFrom inclusive), not revoked and before validUntil (exclusive). */
  isEffectiveAt(at: Date): boolean {
    return this.validFromValue <= at && this.isLiveAt(at);
  }

  /** A cycle still occupying the Membership–Role pair: not revoked and not yet expired. */
  isLiveAt(at: Date): boolean {
    if (this.revokedAtValue) return false;
    return !this.validUntilValue || at < this.validUntilValue;
  }
}

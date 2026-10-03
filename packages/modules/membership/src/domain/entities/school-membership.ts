import { MembershipDomainError } from '../errors/membership-domain-error';
import {
  membershipId,
  schoolId,
  userId,
  type MembershipId,
  type SchoolId,
  type UserId,
} from '../value-objects/identifiers';

export type MembershipState = 'PENDING' | 'ACTIVE' | 'REVOKED';

export interface SchoolMembershipSnapshot {
  readonly membershipId: string;
  readonly userId: string;
  readonly schoolId: string;
  readonly state: MembershipState;
  readonly createdAt: Date;
  readonly activatedAt?: Date | null;
  readonly revokedAt?: Date | null;
}

export class SchoolMembership {
  private constructor(
    readonly id: MembershipId,
    readonly userId: UserId,
    readonly schoolId: SchoolId,
    readonly state: MembershipState,
    private readonly createdAtValue: Date,
    private readonly activatedAtValue: Date | null,
    private readonly revokedAtValue: Date | null,
  ) {}

  /** A new Membership is always PENDING: never ACTIVE, with no Role or Permission. */
  static create(input: {
    membershipId: string;
    userId: string;
    schoolId: string;
    createdAt: Date;
  }): SchoolMembership {
    return SchoolMembership.restore({ ...input, state: 'PENDING' });
  }

  static restore(snapshot: SchoolMembershipSnapshot): SchoolMembership {
    const activatedAt = snapshot.activatedAt ?? null;
    const revokedAt = snapshot.revokedAt ?? null;

    if (Number.isNaN(snapshot.createdAt.getTime())) {
      throw new MembershipDomainError('createdAt must be a valid date.');
    }
    if (snapshot.state === 'PENDING' && (activatedAt || revokedAt)) {
      throw new MembershipDomainError('A PENDING Membership has no activation or revocation.');
    }
    if (snapshot.state === 'ACTIVE' && (!activatedAt || revokedAt)) {
      throw new MembershipDomainError('An ACTIVE Membership requires only an activation instant.');
    }
    if (snapshot.state === 'REVOKED' && !revokedAt) {
      throw new MembershipDomainError('A REVOKED Membership requires a revocation instant.');
    }

    return new SchoolMembership(
      membershipId(snapshot.membershipId),
      userId(snapshot.userId),
      schoolId(snapshot.schoolId),
      snapshot.state,
      new Date(snapshot.createdAt),
      activatedAt && new Date(activatedAt),
      revokedAt && new Date(revokedAt),
    );
  }

  /** Only PENDING can become ACTIVE; ACTIVE and REVOKED (terminal) are rejected. */
  activate(at: Date): SchoolMembership {
    if (this.state !== 'PENDING') {
      throw new MembershipDomainError('Only a PENDING Membership can be activated.');
    }
    return SchoolMembership.restore({
      membershipId: this.id,
      userId: this.userId,
      schoolId: this.schoolId,
      state: 'ACTIVE',
      createdAt: this.createdAtValue,
      activatedAt: at,
    });
  }

  get createdAt(): Date {
    return new Date(this.createdAtValue);
  }

  get activatedAt(): Date | null {
    return this.activatedAtValue && new Date(this.activatedAtValue);
  }

  get revokedAt(): Date | null {
    return this.revokedAtValue && new Date(this.revokedAtValue);
  }

  /** PENDING and ACTIVE occupy the User–School pair; REVOKED is terminal history. */
  get isOpen(): boolean {
    return this.state === 'PENDING' || this.state === 'ACTIVE';
  }
}

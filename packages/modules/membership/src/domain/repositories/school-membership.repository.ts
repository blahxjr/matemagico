import type { SchoolMembership } from '../entities/school-membership';
import type { MembershipId, SchoolId, UserId } from '../value-objects/identifiers';

export type AddMembershipResult = 'CREATED' | 'CONFLICT';

export interface SchoolMembershipRepository {
  findById(id: MembershipId): Promise<SchoolMembership | null>;
  /** Returns the PENDING or ACTIVE Membership of the User–School pair, if any. */
  findOpenByUserAndSchool(userId: UserId, schoolId: SchoolId): Promise<SchoolMembership | null>;
  /** Every Membership cycle (any state) of the User–School pair. */
  listByUserAndSchool(userId: UserId, schoolId: SchoolId): Promise<readonly SchoolMembership[]>;
  /**
   * Registers a PENDING Membership. Must atomically answer CONFLICT when the pair
   * already has an open Membership, so concurrent creations cannot both succeed.
   */
  add(membership: SchoolMembership): Promise<AddMembershipResult>;
  /**
   * Atomically persists PENDING → ACTIVE. Returns false when the Membership no longer
   * exists or is not PENDING (e.g. lost a concurrent transition), so it is never activated twice.
   */
  activate(id: MembershipId, activatedAt: Date): Promise<boolean>;
}

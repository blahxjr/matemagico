import type { Grant } from '../entities/grant';
import type { MembershipId, RoleId } from '../value-objects/identifiers';

export type AddGrantResult = 'CREATED' | 'CONFLICT';

export interface GrantRepository {
  /** Returns the live (not revoked, not expired) Grant for the Membership–Role pair, if any. */
  findLiveByMembershipAndRole(
    membershipId: MembershipId,
    roleId: RoleId,
    at: Date,
  ): Promise<Grant | null>;
  /** Every Grant cycle (including revoked/expired) of the Membership; callers decide effectiveness. */
  listByMembership(membershipId: MembershipId): Promise<readonly Grant[]>;
  /**
   * Registers a new cycle. Must atomically answer CONFLICT when a live Grant already exists
   * for the Membership–Role pair, so concurrent grants cannot both succeed.
   */
  add(grant: Grant, at: Date): Promise<AddGrantResult>;
}

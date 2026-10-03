/** Authenticated actor, derived from a Session already validated by Auth (never client-trusted). */
export interface ActorContext {
  readonly userId: string;
}

/** Server-side check: the actor is an ACTIVE SCHOOL_ADMIN with the applicable Permission in the School. */
export interface ActorAuthorizer {
  canAdministerSchool(actor: ActorContext, schoolId: string): Promise<boolean>;
}

/** Public Users contract (ResolveUser). */
export interface UserDirectory {
  isActiveUser(userId: string): Promise<boolean>;
}

/** Public Schools contract (ResolveSchool / ValidateSchool). */
export interface SchoolDirectory {
  isEnabledSchool(schoolId: string): Promise<boolean>;
}

/** Event documented in the contract for the effective PENDING → ACTIVE transition. */
export interface MembershipEventPublisher {
  publishMembershipCreated(event: {
    membershipId: string;
    userId: string;
    schoolId: string;
    occurredAt: Date;
  }): Promise<void>;
  publishRoleGranted(event: {
    grantId: string;
    membershipId: string;
    roleId: string;
    schoolId: string;
    grantedBy: string;
    occurredAt: Date;
  }): Promise<void>;
}

export interface GrantIdGenerator {
  next(): string;
}

export interface Clock {
  now(): Date;
}

export interface MembershipIdGenerator {
  next(): string;
}

import type { PasswordVerifier, UserRepository } from '@matemagico/auth';
import type {
  ActorAuthorizer,
  MembershipEventPublisher,
  SchoolDirectory,
  UserDirectory,
} from '@matemagico/membership';

/*
 * Provisional ports. Each one is FAIL CLOSED: it denies or finds nothing, so a container
 * built without real implementations can never grant access. Replace through `overrides`.
 */

// TODO(TECH-DEBT: ActorAuthorizer real): resolve ACTIVE SCHOOL_ADMIN + Permission from Grants.
export const denyAllActorAuthorizer: ActorAuthorizer = {
  canAdministerSchool: async () => false,
};

// TODO(TECH-DEBT: UserDirectory real): backed by the Users module (ResolveUser).
export const noUserDirectory: UserDirectory = {
  isActiveUser: async () => false,
};

// TODO(TECH-DEBT: SchoolDirectory real): backed by the Schools module (ResolveSchool).
export const noSchoolDirectory: SchoolDirectory = {
  isEnabledSchool: async () => false,
};

// TODO(TECH-DEBT: Users module): identity lookup by e-mail / userId owned by Users.
export const noUserRepository: UserRepository = {
  findByNormalizedEmail: async () => null,
  findByUserId: async () => null,
};

// TODO(TECH-DEBT: Argon2id verifier): real password verification adapter.
export const rejectAllPasswordVerifier: PasswordVerifier = {
  verify: async () => false,
};

// TODO(TECH-DEBT: Outbox Pattern): events are discarded until the outbox exists.
export const discardingEventPublisher: MembershipEventPublisher = {
  publishMembershipCreated: async () => undefined,
  publishRoleGranted: async () => undefined,
};

export { CreateMembershipService } from './application/create-membership/create-membership.service';
export type {
  CreateMembershipDependencies,
  CreateMembershipInput,
  CreateMembershipOutput,
} from './application/create-membership/create-membership.service';
export { ActivateMembershipService } from './application/activate-membership/activate-membership.service';
export { GrantRoleService } from './application/grant-role/grant-role.service';
export type {
  GrantRoleDependencies,
  GrantRoleInput,
  GrantRoleOutput,
} from './application/grant-role/grant-role.service';
export { Role } from './domain/entities/role';
export type { RoleScope, RoleCatalogStatus, RoleSnapshot } from './domain/entities/role';
export { Grant } from './domain/entities/grant';
export type { GrantSnapshot } from './domain/entities/grant';
export type { RoleRepository } from './domain/repositories/role.repository';
export type { AddGrantResult, GrantRepository } from './domain/repositories/grant.repository';
export { InMemoryRoleRepository } from './infrastructure/in-memory/in-memory-role.repository';
export { InMemoryGrantRepository } from './infrastructure/in-memory/in-memory-grant.repository';
export type {
  ActivateMembershipDependencies,
  ActivateMembershipInput,
  ActivateMembershipOutput,
} from './application/activate-membership/activate-membership.service';
export { MembershipError } from './application/errors/membership-error';
export type { MembershipErrorCode } from './application/errors/membership-error';
export type {
  ActorAuthorizer,
  ActorContext,
  Clock,
  MembershipIdGenerator,
  GrantIdGenerator,
  MembershipEventPublisher,
  SchoolDirectory,
  UserDirectory,
} from './application/ports/ports';
export { SchoolMembership } from './domain/entities/school-membership';
export type {
  MembershipState,
  SchoolMembershipSnapshot,
} from './domain/entities/school-membership';
export type {
  AddMembershipResult,
  SchoolMembershipRepository,
} from './domain/repositories/school-membership.repository';
export {
  membershipId,
  schoolId,
  userId,
  roleId,
  grantId,
} from './domain/value-objects/identifiers';
export type {
  MembershipId,
  SchoolId,
  UserId,
  RoleId,
  GrantId,
} from './domain/value-objects/identifiers';
export { InMemorySchoolMembershipRepository } from './infrastructure/in-memory/in-memory-school-membership.repository';
export { ResolveSchoolContextService } from './application/school-context/resolve-school-context.service';
export type {
  ResolveSchoolContextDependencies,
  ResolveSchoolContextInput,
  ResolveSchoolContextOutput,
  SchoolContext,
} from './application/school-context/resolve-school-context.service';
export { ValidateSchoolContextService } from './application/school-context/validate-school-context.service';
export type {
  ValidateSchoolContextDependencies,
  ValidateSchoolContextInput,
  ValidateSchoolContextOutput,
} from './application/school-context/validate-school-context.service';
export { ResolvePermissionsService } from './application/school-context/resolve-permissions.service';
export type {
  ResolvePermissionsDependencies,
  ResolvePermissionsInput,
  ResolvePermissionsOutput,
} from './application/school-context/resolve-permissions.service';
export { SchoolContextError } from './application/errors/school-context-error';
export type { SchoolContextErrorCode } from './application/errors/school-context-error';
export { RolePermission } from './domain/entities/role-permission';
export type { PermissionRepository } from './domain/repositories/permission.repository';
export { InMemoryPermissionRepository } from './infrastructure/in-memory/in-memory-permission.repository';
export {
  GrantPrismaRepository,
  PermissionPrismaRepository,
  RolePrismaRepository,
  SchoolMembershipPrismaRepository,
} from './infrastructure/persistence/prisma';
export {
  AUTHORIZATION_PERMISSIONS,
  GrantBasedActorAuthorizer,
  SCHOOL_ADMIN_ROLE_CODE,
} from './application/authorization/grant-based-actor-authorizer';
export type { GrantBasedActorAuthorizerDependencies } from './application/authorization/grant-based-actor-authorizer';

import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  AuthAccountPrismaRepository,
  AuthenticateUserService,
  GetSessionService,
  InMemoryLoginAttemptLimiter,
  PasswordCredentialPrismaRepository,
  SessionPrismaRepository,
  systemClock,
  uuidSessionIdGenerator,
  type Clock as AuthClock,
  type LoginAttemptLimiter,
  type PasswordVerifier,
  type SessionIdGenerator,
  type UserRepository,
} from '@matemagico/auth';
import {
  ActivateMembershipService,
  CreateMembershipService,
  GrantPrismaRepository,
  GrantRoleService,
  PermissionPrismaRepository,
  ResolvePermissionsService,
  ResolveSchoolContextService,
  RolePrismaRepository,
  SchoolMembershipPrismaRepository,
  ValidateSchoolContextService,
  type ActorAuthorizer,
  type Clock as MembershipClock,
  type GrantIdGenerator,
  type MembershipEventPublisher,
  type MembershipIdGenerator,
  type SchoolDirectory,
  type UserDirectory,
} from '@matemagico/membership';
import {
  denyAllActorAuthorizer,
  discardingEventPublisher,
  noSchoolDirectory,
  noUserDirectory,
  noUserRepository,
  rejectAllPasswordVerifier,
} from './provisional-ports';

/** Ports that have no real implementation yet; see provisional-ports.ts. */
export interface CompositionOverrides {
  readonly actorAuthorizer?: ActorAuthorizer;
  readonly userDirectory?: UserDirectory;
  readonly schoolDirectory?: SchoolDirectory;
  readonly userRepository?: UserRepository;
  readonly passwordVerifier?: PasswordVerifier;
  readonly events?: MembershipEventPublisher;
  readonly attemptLimiter?: LoginAttemptLimiter;
  readonly clock?: AuthClock & MembershipClock;
  readonly sessionIds?: SessionIdGenerator;
  readonly membershipIds?: MembershipIdGenerator;
  readonly grantIds?: GrantIdGenerator;
}

export interface CompositionRoot {
  readonly prisma: PrismaClient;
  readonly repositories: {
    readonly authAccounts: AuthAccountPrismaRepository;
    readonly passwordCredentials: PasswordCredentialPrismaRepository;
    readonly sessions: SessionPrismaRepository;
    readonly memberships: SchoolMembershipPrismaRepository;
    readonly roles: RolePrismaRepository;
    readonly grants: GrantPrismaRepository;
    readonly permissions: PermissionPrismaRepository;
  };
  readonly services: {
    readonly authenticateUser: AuthenticateUserService;
    readonly getSession: GetSessionService;
    readonly createMembership: CreateMembershipService;
    readonly activateMembership: ActivateMembershipService;
    readonly grantRole: GrantRoleService;
    readonly resolveSchoolContext: ResolveSchoolContextService;
    readonly resolvePermissions: ResolvePermissionsService;
    readonly validateSchoolContext: ValidateSchoolContextService;
  };
}

/** Wires every application service to Prisma adapters sharing the given PrismaClient. */
export function createCompositionRoot(
  prisma: PrismaClient,
  overrides: CompositionOverrides = {},
): CompositionRoot {
  const clock = overrides.clock ?? systemClock;
  const users = overrides.userRepository ?? noUserRepository;
  const userDirectory = overrides.userDirectory ?? noUserDirectory;
  const schools = overrides.schoolDirectory ?? noSchoolDirectory;
  const actorAuthorizer = overrides.actorAuthorizer ?? denyAllActorAuthorizer;
  const events = overrides.events ?? discardingEventPublisher;

  const repositories = {
    authAccounts: new AuthAccountPrismaRepository(prisma),
    passwordCredentials: new PasswordCredentialPrismaRepository(prisma),
    sessions: new SessionPrismaRepository(prisma),
    memberships: new SchoolMembershipPrismaRepository(prisma),
    roles: new RolePrismaRepository(prisma),
    grants: new GrantPrismaRepository(prisma),
    permissions: new PermissionPrismaRepository(prisma),
  };

  const resolveSchoolContext = new ResolveSchoolContextService({
    memberships: repositories.memberships,
    users: userDirectory,
    schools,
    clock,
  });

  const services = {
    authenticateUser: new AuthenticateUserService({
      users,
      authAccounts: repositories.authAccounts,
      passwordCredentials: repositories.passwordCredentials,
      sessions: repositories.sessions,
      passwordVerifier: overrides.passwordVerifier ?? rejectAllPasswordVerifier,
      attemptLimiter: overrides.attemptLimiter ?? new InMemoryLoginAttemptLimiter(),
      clock,
      sessionIds: overrides.sessionIds ?? uuidSessionIdGenerator,
    }),
    getSession: new GetSessionService({ sessions: repositories.sessions, users, clock }),
    createMembership: new CreateMembershipService({
      memberships: repositories.memberships,
      actorAuthorizer,
      users: userDirectory,
      schools,
      clock,
      membershipIds: overrides.membershipIds ?? { next: () => randomUUID() },
    }),
    activateMembership: new ActivateMembershipService({
      memberships: repositories.memberships,
      actorAuthorizer,
      users: userDirectory,
      schools,
      events,
      clock,
    }),
    grantRole: new GrantRoleService({
      memberships: repositories.memberships,
      roles: repositories.roles,
      grants: repositories.grants,
      actorAuthorizer,
      schools,
      events,
      clock,
      grantIds: overrides.grantIds ?? { next: () => randomUUID() },
    }),
    resolveSchoolContext,
    resolvePermissions: new ResolvePermissionsService({
      schoolContext: resolveSchoolContext,
      grants: repositories.grants,
      roles: repositories.roles,
      permissions: repositories.permissions,
      clock,
    }),
    validateSchoolContext: new ValidateSchoolContextService({
      memberships: repositories.memberships,
      users: userDirectory,
      schools,
    }),
  };

  return { prisma, repositories, services };
}

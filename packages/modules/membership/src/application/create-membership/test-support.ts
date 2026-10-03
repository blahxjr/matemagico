import { InMemorySchoolMembershipRepository } from '../../infrastructure/in-memory/in-memory-school-membership.repository';
import type {
  ActorAuthorizer,
  MembershipEventPublisher,
  SchoolDirectory,
  UserDirectory,
} from '../ports/ports';
import { InMemoryGrantRepository } from '../../infrastructure/in-memory/in-memory-grant.repository';
import { InMemoryRoleRepository } from '../../infrastructure/in-memory/in-memory-role.repository';
import { Role } from '../../domain/entities/role';
import { RolePermission } from '../../domain/entities/role-permission';
import { InMemoryPermissionRepository } from '../../infrastructure/in-memory/in-memory-permission.repository';
import { ResolvePermissionsService } from '../school-context/resolve-permissions.service';
import { ResolveSchoolContextService } from '../school-context/resolve-school-context.service';
import { ValidateSchoolContextService } from '../school-context/validate-school-context.service';
import { GrantRoleService } from '../grant-role/grant-role.service';
import { ActivateMembershipService } from '../activate-membership/activate-membership.service';
import { CreateMembershipService } from './create-membership.service';

export const NOW = new Date('2026-01-01T12:00:00.000Z');

class FakeAuthorizer implements ActorAuthorizer {
  allowed = true;
  failing = false;
  readonly denied = new Set<string>();
  async canAdministerSchool(actor: { userId: string }, _schoolId: string): Promise<boolean> {
    if (this.failing) throw new Error('authorization unavailable');
    return this.allowed && !this.denied.has(actor.userId);
  }
}

class FakeUsers implements UserDirectory {
  readonly active = new Set<string>(['user-1']);
  failing = false;
  async isActiveUser(userId: string): Promise<boolean> {
    if (this.failing) throw new Error('users unavailable');
    return this.active.has(userId);
  }
}

class FakeSchools implements SchoolDirectory {
  readonly enabled = new Set<string>(['school-1']);
  failing = false;
  async isEnabledSchool(schoolId: string): Promise<boolean> {
    if (this.failing) throw new Error('schools unavailable');
    return this.enabled.has(schoolId);
  }
}

class FakeEvents implements MembershipEventPublisher {
  readonly published: unknown[] = [];
  failing = false;
  async publishMembershipCreated(event: unknown): Promise<void> {
    if (this.failing) throw new Error('events unavailable');
    this.published.push(event);
  }
  readonly granted: unknown[] = [];
  async publishRoleGranted(event: unknown): Promise<void> {
    if (this.failing) throw new Error('events unavailable');
    this.granted.push(event);
  }
}

export function createHarness() {
  const memberships = new InMemorySchoolMembershipRepository();
  const authorizer = new FakeAuthorizer();
  const users = new FakeUsers();
  const schools = new FakeSchools();
  const events = new FakeEvents();
  const state = { counter: 0 };
  const clock = { now: () => NOW };

  const service = new CreateMembershipService({
    memberships,
    actorAuthorizer: authorizer,
    users,
    schools,
    clock,
    membershipIds: { next: () => `membership-${++state.counter}` },
  });

  const activateService = new ActivateMembershipService({
    memberships,
    actorAuthorizer: authorizer,
    users,
    schools,
    events,
    clock,
  });

  const activate = (
    membershipId: string,
    actor: { userId: string } | null = { userId: 'admin-1' },
  ) => activateService.execute({ membershipId, actor });

  const roles = new InMemoryRoleRepository();
  const seedRole = (
    roleId: string,
    scope: 'SCHOOL' | 'GLOBAL',
    status: 'APPROVED' | 'REMOVED',
    privileged = false,
  ) =>
    roles.roles.set(
      roleId,
      Role.restore({ roleId, code: roleId.toUpperCase(), scope, status, privileged }),
    );
  seedRole('teacher', 'SCHOOL', 'APPROVED');
  seedRole('school-admin', 'SCHOOL', 'APPROVED', true);
  seedRole('removed-role', 'SCHOOL', 'REMOVED');
  seedRole('global-role', 'GLOBAL', 'APPROVED');
  roles.allowlist.set(
    'admin-1',
    new Set(['teacher', 'school-admin', 'removed-role', 'global-role']),
  );

  const grants = new InMemoryGrantRepository();
  const grantCounter = { value: 0 };
  const grantService = new GrantRoleService({
    memberships,
    roles,
    grants,
    actorAuthorizer: authorizer,
    schools,
    events,
    clock,
    grantIds: { next: () => `grant-${++grantCounter.value}` },
  });

  const grantRole = (
    membershipId: string,
    overrides: Partial<Parameters<GrantRoleService['execute']>[0]> = {},
  ) =>
    grantService.execute({
      membershipId,
      roleId: 'teacher',
      validFrom: NOW,
      actor: { userId: 'admin-1' },
      ...overrides,
    });

  const permissions = new InMemoryPermissionRepository();
  for (const [roleId, permissionCode] of [
    ['teacher', 'class:read'],
    ['teacher', 'class:create'],
    ['school-admin', 'school:manage'],
  ]) {
    permissions.associations.push(RolePermission.create({ roleId, permissionCode }));
  }

  const schoolContextService = new ResolveSchoolContextService({
    memberships,
    users,
    schools,
    clock,
  });
  const resolvePermissionsService = new ResolvePermissionsService({
    schoolContext: schoolContextService,
    grants,
    roles,
    permissions,
    clock,
  });

  const resolveSchoolContext = (
    overrides: Partial<Parameters<ResolveSchoolContextService['execute']>[0]> = {},
  ) =>
    schoolContextService.execute({
      actor: { userId: 'user-1' },
      schoolId: 'school-1',
      ...overrides,
    });

  const resolvePermissions = (
    membershipId: string,
    overrides: Partial<Parameters<ResolvePermissionsService['execute']>[0]> = {},
  ) =>
    resolvePermissionsService.execute({
      actor: { userId: 'user-1' },
      context: { userId: 'user-1', schoolId: 'school-1', membershipId },
      action: 'class:read',
      ...overrides,
    });

  const validateService = new ValidateSchoolContextService({ memberships, users, schools });
  const validateSchoolContext = (
    membershipId: string,
    overrides: Partial<Parameters<ValidateSchoolContextService['execute']>[0]> = {},
  ) =>
    validateService.execute({
      actor: { userId: 'user-1' },
      context: { userId: 'user-1', schoolId: 'school-1', membershipId },
      ...overrides,
    });

  const create = (overrides: Partial<Parameters<CreateMembershipService['execute']>[0]> = {}) =>
    service.execute({
      userId: 'user-1',
      schoolId: 'school-1',
      actor: { userId: 'admin-1' },
      ...overrides,
    });

  return {
    service,
    create,
    activate,
    grantRole,
    resolveSchoolContext,
    resolvePermissions,
    validateSchoolContext,
    permissions,
    roles,
    grants,
    memberships,
    authorizer,
    users,
    schools,
    events,
  };
}

export const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'NO_ERROR',
    (error: { code?: string }) => error.code ?? 'UNEXPECTED',
  );

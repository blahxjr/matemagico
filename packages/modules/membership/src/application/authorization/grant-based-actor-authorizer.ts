import type { GrantRepository } from '../../domain/repositories/grant.repository';
import type { PermissionRepository } from '../../domain/repositories/permission.repository';
import type { RoleRepository } from '../../domain/repositories/role.repository';
import type { SchoolMembershipRepository } from '../../domain/repositories/school-membership.repository';
import {
  roleId as toRoleId,
  schoolId as toSchoolId,
  userId as toUserId,
} from '../../domain/value-objects/identifiers';
import type { ActorAuthorizer, ActorContext, Clock } from '../ports/ports';

export const SCHOOL_ADMIN_ROLE_CODE = 'SCHOOL_ADMIN';

export const AUTHORIZATION_PERMISSIONS = {
  schoolUpdate: 'school:update',
  membershipActivate: 'membership:activate',
  roleGrant: 'role:grant',
} as const;

export interface GrantBasedActorAuthorizerDependencies {
  readonly memberships: SchoolMembershipRepository;
  readonly grants: GrantRepository;
  readonly roles: RoleRepository;
  readonly permissions: PermissionRepository;
  readonly clock: Clock;
}

/**
 * Server-side authorization derived only from persisted state: the actor needs an ACTIVE
 * Membership in the School holding an effective, approved SCHOOL_ADMIN Grant. Specific actions
 * additionally require the matching Permission of the actor's effective Roles. Deny by default.
 */
export class GrantBasedActorAuthorizer implements ActorAuthorizer {
  constructor(private readonly deps: GrantBasedActorAuthorizerDependencies) {}

  canAdministerSchool(actor: ActorContext, schoolId: string): Promise<boolean> {
    return this.check(actor, schoolId);
  }

  canManageSchool(actor: ActorContext, schoolId: string): Promise<boolean> {
    return this.check(actor, schoolId, AUTHORIZATION_PERMISSIONS.schoolUpdate);
  }

  canActivateMembership(actor: ActorContext, schoolId: string): Promise<boolean> {
    return this.check(actor, schoolId, AUTHORIZATION_PERMISSIONS.membershipActivate);
  }

  async canGrantRole(actor: ActorContext, schoolId: string, roleId: string): Promise<boolean> {
    if (!(await this.check(actor, schoolId, AUTHORIZATION_PERMISSIONS.roleGrant))) return false;
    if (isBlank(roleId)) return false;
    return this.deps.roles.isGrantableByActor(
      toUserId(actor.userId),
      toSchoolId(schoolId),
      toRoleId(roleId),
    );
  }

  private async check(
    actor: ActorContext | null | undefined,
    schoolId: string,
    permission?: string,
  ): Promise<boolean> {
    if (!actor || isBlank(actor.userId) || isBlank(schoolId)) return false;
    const permissions = await this.adminPermissions(actor.userId, schoolId);
    if (!permissions) return false;
    return permission === undefined || permissions.has(permission);
  }

  /** Returns the actor's effective permissions, or null when the actor is not a SCHOOL_ADMIN. */
  private async adminPermissions(
    userId: string,
    schoolId: string,
  ): Promise<ReadonlySet<string> | null> {
    const now = this.deps.clock.now();
    const memberships = await this.deps.memberships.listByUserAndSchool(
      toUserId(userId),
      toSchoolId(schoolId),
    );

    let isAdmin = false;
    const roleIds = new Set<string>();
    for (const membership of memberships) {
      if (membership.state !== 'ACTIVE') continue;
      for (const grant of await this.deps.grants.listByMembership(membership.id)) {
        if (grant.schoolId !== schoolId || !grant.isEffectiveAt(now)) continue;
        const role = await this.deps.roles.findById(grant.roleId);
        if (!role || !role.isGrantableInSchool) continue;
        roleIds.add(role.id);
        if (role.code === SCHOOL_ADMIN_ROLE_CODE) isAdmin = true;
      }
    }
    if (!isAdmin) return null;

    const associations = await this.deps.permissions.findByRoleIds(
      [...roleIds].map((id) => toRoleId(id)),
    );
    return new Set(associations.map((entry) => entry.permissionCode));
  }
}

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim();

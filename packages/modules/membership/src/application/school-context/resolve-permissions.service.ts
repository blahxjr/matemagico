import type { GrantRepository } from '../../domain/repositories/grant.repository';
import type { PermissionRepository } from '../../domain/repositories/permission.repository';
import type { RoleRepository } from '../../domain/repositories/role.repository';
import type { RoleId } from '../../domain/value-objects/identifiers';
import { membershipId as toMembershipId } from '../../domain/value-objects/identifiers';
import { SchoolContextError } from '../errors/school-context-error';
import type { ActorContext, Clock } from '../ports/ports';
import type { ResolveSchoolContextService, SchoolContext } from './resolve-school-context.service';

export interface ResolvePermissionsInput {
  readonly actor: ActorContext | null | undefined;
  /** Candidate context, re-verified here: it is never trusted as proof. */
  readonly context: Pick<SchoolContext, 'userId' | 'schoolId' | 'membershipId'> | null | undefined;
  /** Requested action as `resource:action`. */
  readonly action: string;
}

export interface ResolvePermissionsOutput {
  readonly result: 'ALLOWED';
  readonly userId: string;
  readonly membershipId: string;
  readonly schoolId: string;
  /** Requested action; valid only for this operation. */
  readonly action: string;
  /** Every Permission derived from the effective Grants of this School only. */
  readonly permissions: readonly string[];
  readonly resolvedAt: Date;
}

export interface ResolvePermissionsDependencies {
  readonly schoolContext: ResolveSchoolContextService;
  readonly grants: GrantRepository;
  readonly roles: RoleRepository;
  readonly permissions: PermissionRepository;
  readonly clock: Clock;
}

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim();

export class ResolvePermissionsService {
  constructor(private readonly deps: ResolvePermissionsDependencies) {}

  async execute(input: ResolvePermissionsInput): Promise<ResolvePermissionsOutput> {
    const actor = input?.actor;
    const candidate = input?.context;
    if (!actor || isBlank(actor.userId)) throw new SchoolContextError('SC-001');
    if (!candidate || isBlank(candidate.membershipId) || isBlank(candidate.schoolId)) {
      throw new SchoolContextError('SC-002');
    }
    if (candidate.userId !== actor.userId) throw new SchoolContextError('SC-001');

    // Re-resolve from the authoritative sources; the candidate must match exactly.
    const context = await this.deps.schoolContext.execute({ actor, schoolId: candidate.schoolId });
    if (context.membershipId !== candidate.membershipId) throw new SchoolContextError('SC-002');

    if (isBlank(input.action)) throw new SchoolContextError('SC-004');

    const now = this.deps.clock.now();
    const grants = await this.attempt(() =>
      this.deps.grants.listByMembership(toMembershipId(context.membershipId)),
    );
    const effective = grants.filter((g) => g.schoolId === context.schoolId && g.isEffectiveAt(now));
    if (effective.length === 0) throw new SchoolContextError('SC-004');

    const eligibleRoleIds: RoleId[] = [];
    for (const roleId of new Set(effective.map((g) => g.roleId))) {
      const role = await this.attempt(() => this.deps.roles.findById(roleId));
      if (role?.isGrantableInSchool) eligibleRoleIds.push(role.id);
    }
    if (eligibleRoleIds.length === 0) throw new SchoolContextError('SC-004');

    const associations = await this.attempt(() =>
      this.deps.permissions.findByRoleIds(eligibleRoleIds),
    );
    const permissions = [
      ...new Set(
        associations.filter((a) => eligibleRoleIds.includes(a.roleId)).map((a) => a.permissionCode),
      ),
    ].sort();
    if (!permissions.includes(input.action)) throw new SchoolContextError('SC-004');

    return {
      result: 'ALLOWED',
      userId: context.userId,
      membershipId: context.membershipId,
      schoolId: context.schoolId,
      action: input.action,
      permissions,
      resolvedAt: now,
    };
  }

  private async attempt<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new SchoolContextError('SC-005');
    }
  }
}

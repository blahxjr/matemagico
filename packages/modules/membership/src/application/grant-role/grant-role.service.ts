import { Grant } from '../../domain/entities/grant';
import type { GrantRepository } from '../../domain/repositories/grant.repository';
import type { RoleRepository } from '../../domain/repositories/role.repository';
import type { SchoolMembershipRepository } from '../../domain/repositories/school-membership.repository';
import {
  membershipId as toMembershipId,
  roleId as toRoleId,
  userId as toUserId,
} from '../../domain/value-objects/identifiers';
import { MembershipError } from '../errors/membership-error';
import type {
  ActorAuthorizer,
  ActorContext,
  Clock,
  GrantIdGenerator,
  MembershipEventPublisher,
  SchoolDirectory,
} from '../ports/ports';

export interface GrantRoleInput {
  readonly membershipId: string;
  readonly roleId: string;
  readonly validFrom: Date;
  readonly validUntil?: Date | null;
  readonly actor: ActorContext | null | undefined;
  /** Second approver, required when the Role is privileged (SCHOOL_ADMIN). */
  readonly additionalApproval?: { readonly approverUserId: string } | null;
}

export interface GrantRoleOutput {
  readonly grantId: string;
  readonly membershipId: string;
  readonly roleId: string;
  readonly schoolId: string;
  readonly grantedBy: string;
  readonly validFrom: Date;
  readonly validUntil?: Date;
}

export interface GrantRoleDependencies {
  readonly memberships: SchoolMembershipRepository;
  readonly roles: RoleRepository;
  readonly grants: GrantRepository;
  readonly actorAuthorizer: ActorAuthorizer;
  readonly schools: SchoolDirectory;
  readonly events: MembershipEventPublisher;
  readonly clock: Clock;
  readonly grantIds: GrantIdGenerator;
}

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim();
const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

export class GrantRoleService {
  constructor(private readonly deps: GrantRoleDependencies) {}

  async execute(input: GrantRoleInput): Promise<GrantRoleOutput> {
    const actor = input?.actor;
    if (!actor || isBlank(actor.userId)) throw new MembershipError('MEM-005');
    if (isBlank(input.membershipId)) throw new MembershipError('MEM-001');

    const membership = await this.attempt(
      () => this.deps.memberships.findById(toMembershipId(input.membershipId)),
      'MEM-005',
    );
    if (!membership) throw new MembershipError('MEM-001');

    // The actor must administer the School of the Membership, never a client-supplied School.
    const authorized = await this.attempt(
      () => this.deps.actorAuthorizer.canAdministerSchool(actor, membership.schoolId),
      'MEM-005',
    );
    if (!authorized) throw new MembershipError('MEM-005');

    if (membership.state !== 'ACTIVE') throw new MembershipError('MEM-001');

    // No self-elevation: an actor cannot grant Roles to their own Membership.
    if (membership.userId === actor.userId) throw new MembershipError('MEM-005');

    const schoolEnabled = await this.attempt(
      () => this.deps.schools.isEnabledSchool(membership.schoolId),
      'MEM-003',
    );
    if (!schoolEnabled) throw new MembershipError('MEM-003');

    if (isBlank(input.roleId)) throw new MembershipError('MEM-004');
    if (!isValidDate(input.validFrom)) throw new MembershipError('MEM-004');
    const validUntil = input.validUntil ?? undefined;
    if (validUntil !== undefined && (!isValidDate(validUntil) || validUntil <= input.validFrom)) {
      throw new MembershipError('MEM-004');
    }

    const roleId = toRoleId(input.roleId);
    const role = await this.attempt(() => this.deps.roles.findById(roleId), 'MEM-005');
    if (!role || !role.isGrantableInSchool) throw new MembershipError('MEM-004');

    const actorUserId = toUserId(actor.userId);
    const allowed = await this.attempt(
      () => this.deps.roles.isGrantableByActor(actorUserId, membership.schoolId, role.id),
      'MEM-005',
    );
    if (!allowed) throw new MembershipError('MEM-004');

    if (role.privileged) await this.requireValidSecondApproval(input, membership);

    const now = this.deps.clock.now();
    const existing = await this.attempt(
      () => this.deps.grants.findLiveByMembershipAndRole(membership.id, role.id, now),
      'MEM-005',
    );
    if (existing) throw new MembershipError('MEM-004');

    const grant = Grant.create({
      grantId: this.deps.grantIds.next(),
      membershipId: membership.id,
      roleId: role.id,
      schoolId: membership.schoolId,
      grantedBy: actor.userId,
      validFrom: input.validFrom,
      validUntil,
    });

    const result = await this.attempt(() => this.deps.grants.add(grant, now), 'MEM-005');
    if (result !== 'CREATED') throw new MembershipError('MEM-004');

    // Fail closed: success is not reported unless the documented event could be emitted.
    await this.attempt(
      () =>
        this.deps.events.publishRoleGranted({
          grantId: grant.id,
          membershipId: grant.membershipId,
          roleId: grant.roleId,
          schoolId: grant.schoolId,
          grantedBy: grant.grantedBy,
          occurredAt: now,
        }),
      'MEM-005',
    );

    return {
      grantId: grant.id,
      membershipId: grant.membershipId,
      roleId: grant.roleId,
      schoolId: grant.schoolId,
      grantedBy: grant.grantedBy,
      validFrom: grant.validFrom,
      ...(grant.validUntil ? { validUntil: grant.validUntil } : {}),
    };
  }

  /** The second approver must be a different administrator of the same School, and not the target. */
  private async requireValidSecondApproval(
    input: GrantRoleInput,
    membership: { schoolId: string; userId: string },
  ): Promise<void> {
    const approver = input.additionalApproval?.approverUserId;
    if (isBlank(approver) || approver === input.actor!.userId || approver === membership.userId) {
      throw new MembershipError('MEM-004');
    }
    const approved = await this.attempt(
      () =>
        this.deps.actorAuthorizer.canAdministerSchool({ userId: approver! }, membership.schoolId),
      'MEM-005',
    );
    if (!approved) throw new MembershipError('MEM-004');
  }

  private async attempt<T>(operation: () => Promise<T>, code: MembershipError['code']): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new MembershipError(code);
    }
  }
}

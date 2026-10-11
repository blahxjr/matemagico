import type { SchoolMembershipRepository } from '../../domain/repositories/school-membership.repository';
import { membershipId as toMembershipId } from '../../domain/value-objects/identifiers';
import { MembershipError } from '../errors/membership-error';
import type {
  ActorAuthorizer,
  ActorContext,
  Clock,
  MembershipEventPublisher,
  SchoolDirectory,
  UserDirectory,
} from '../ports/ports';

export interface ActivateMembershipInput {
  readonly membershipId: string;
  readonly actor: ActorContext | null | undefined;
}

export interface ActivateMembershipOutput {
  readonly membershipId: string;
  readonly userId: string;
  readonly schoolId: string;
  readonly state: 'ACTIVE';
  readonly activatedAt: Date;
}

export interface ActivateMembershipDependencies {
  readonly memberships: SchoolMembershipRepository;
  readonly actorAuthorizer: ActorAuthorizer;
  readonly users: UserDirectory;
  readonly schools: SchoolDirectory;
  readonly events: MembershipEventPublisher;
  readonly clock: Clock;
}

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim();

export class ActivateMembershipService {
  constructor(private readonly deps: ActivateMembershipDependencies) {}

  async execute(input: ActivateMembershipInput): Promise<ActivateMembershipOutput> {
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
      () => this.deps.actorAuthorizer.canActivateMembership(actor, membership.schoolId),
      'MEM-005',
    );
    if (!authorized) throw MembershipError.accessDenied();

    if (membership.state !== 'PENDING') throw new MembershipError('MEM-001');

    if (!(await this.attempt(() => this.deps.users.isActiveUser(membership.userId), 'MEM-002'))) {
      throw new MembershipError('MEM-002');
    }
    if (
      !(await this.attempt(() => this.deps.schools.isEnabledSchool(membership.schoolId), 'MEM-003'))
    ) {
      throw new MembershipError('MEM-003');
    }

    const activatedAt = this.deps.clock.now();
    const activated = await this.attempt(
      () => this.deps.memberships.activate(membership.id, activatedAt),
      'MEM-005',
    );
    if (!activated) throw new MembershipError('MEM-001');

    // Fail closed: success is not reported unless the documented event could be emitted.
    await this.attempt(
      () =>
        this.deps.events.publishMembershipCreated({
          membershipId: membership.id,
          userId: membership.userId,
          schoolId: membership.schoolId,
          occurredAt: activatedAt,
        }),
      'MEM-005',
    );

    return {
      membershipId: membership.id,
      userId: membership.userId,
      schoolId: membership.schoolId,
      state: 'ACTIVE',
      activatedAt,
    };
  }

  private async attempt<T>(operation: () => Promise<T>, code: MembershipError['code']): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new MembershipError(code);
    }
  }
}

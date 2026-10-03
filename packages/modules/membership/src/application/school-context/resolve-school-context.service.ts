import type { SchoolMembershipRepository } from '../../domain/repositories/school-membership.repository';
import { schoolId as toSchoolId, userId as toUserId } from '../../domain/value-objects/identifiers';
import { SchoolContextError, type SchoolContextErrorCode } from '../errors/school-context-error';
import type { ActorContext, Clock, SchoolDirectory, UserDirectory } from '../ports/ports';

export interface ResolveSchoolContextInput {
  /** User of the Session already validated by Auth; never a client-asserted identity. */
  readonly actor: ActorContext | null | undefined;
  /** Requested School: an intent, not proof of access. */
  readonly schoolId: string;
}

/** Ephemeral candidate context for one operation. It carries no Permission and authorizes nothing. */
export interface SchoolContext {
  readonly userId: string;
  readonly schoolId: string;
  readonly membershipId: string;
  readonly resolvedAt: Date;
}

export interface ResolveSchoolContextOutput extends SchoolContext {
  readonly result: 'CONTEXT_RESOLVED';
}

export interface ResolveSchoolContextDependencies {
  readonly memberships: SchoolMembershipRepository;
  readonly users: UserDirectory;
  readonly schools: SchoolDirectory;
  readonly clock: Clock;
}

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim();

export class ResolveSchoolContextService {
  constructor(private readonly deps: ResolveSchoolContextDependencies) {}

  async execute(input: ResolveSchoolContextInput): Promise<ResolveSchoolContextOutput> {
    const actor = input?.actor;
    if (!actor || isBlank(actor.userId)) throw new SchoolContextError('SC-001');
    if (isBlank(input.schoolId)) throw new SchoolContextError('SC-003');

    if (!(await this.attempt(() => this.deps.users.isActiveUser(actor.userId)))) {
      throw new SchoolContextError('SC-001');
    }
    if (!(await this.attempt(() => this.deps.schools.isEnabledSchool(input.schoolId)))) {
      throw new SchoolContextError('SC-003');
    }

    const userId = toUserId(actor.userId);
    const schoolId = toSchoolId(input.schoolId);
    const cycles = await this.attempt(() =>
      this.deps.memberships.listByUserAndSchool(userId, schoolId),
    );

    // Exactly one ACTIVE Membership for the pair; none or an inconsistent duplicate denies.
    const active = cycles.filter((m) => m.state === 'ACTIVE');
    if (active.length !== 1) throw new SchoolContextError('SC-002');
    const membership = active[0];
    if (membership.userId !== userId || membership.schoolId !== schoolId) {
      throw new SchoolContextError('SC-002');
    }

    return {
      result: 'CONTEXT_RESOLVED',
      userId: membership.userId,
      schoolId: membership.schoolId,
      membershipId: membership.id,
      resolvedAt: this.deps.clock.now(),
    };
  }

  // Fail closed: an unavailable dependency never becomes a permissive answer.
  private async attempt<T>(
    operation: () => Promise<T>,
    code: SchoolContextErrorCode = 'SC-005',
  ): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new SchoolContextError(code);
    }
  }
}

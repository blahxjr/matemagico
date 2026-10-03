import type { SchoolMembershipRepository } from '../../domain/repositories/school-membership.repository';
import {
  membershipId as toMembershipId,
  schoolId as toSchoolId,
} from '../../domain/value-objects/identifiers';
import { SchoolContextError, type SchoolContextErrorCode } from '../errors/school-context-error';
import type { ActorContext, SchoolDirectory, UserDirectory } from '../ports/ports';
import type { SchoolContext } from './resolve-school-context.service';

export interface ValidateSchoolContextInput {
  /** User of the Session already validated by Auth. */
  readonly actor: ActorContext | null | undefined;
  /** Candidate previously produced by ResolveSchoolContext. */
  readonly context: Pick<SchoolContext, 'userId' | 'schoolId' | 'membershipId'> | null | undefined;
  /** Optional School that owns the target resource; must match the canonical School. */
  readonly resourceSchoolId?: string;
}

export interface ValidateSchoolContextOutput {
  readonly result: 'VALID';
  readonly userId: string;
  readonly schoolId: string;
  readonly membershipId: string;
}

export interface ValidateSchoolContextDependencies {
  readonly memberships: SchoolMembershipRepository;
  readonly users: UserDirectory;
  readonly schools: SchoolDirectory;
}

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim();

/**
 * Read-only re-check that a resolved context is still usable. It never evaluates
 * Grants, Roles or Permissions: that belongs to ResolvePermissionsService.
 */
export class ValidateSchoolContextService {
  constructor(private readonly deps: ValidateSchoolContextDependencies) {}

  async execute(input: ValidateSchoolContextInput): Promise<ValidateSchoolContextOutput> {
    const actor = input?.actor;
    const context = input?.context;
    if (!actor || isBlank(actor.userId)) throw new SchoolContextError('SC-001');
    if (!context || isBlank(context.userId) || isBlank(context.membershipId)) {
      throw new SchoolContextError('SC-002');
    }
    if (isBlank(context.schoolId)) throw new SchoolContextError('SC-003');
    // A context is bound to the authenticated User; it is never transferable.
    if (context.userId !== actor.userId) throw new SchoolContextError('SC-002');

    if (!(await this.attempt(() => this.deps.users.isActiveUser(actor.userId)))) {
      throw new SchoolContextError('SC-001');
    }
    if (!(await this.attempt(() => this.deps.schools.isEnabledSchool(context.schoolId)))) {
      throw new SchoolContextError('SC-003');
    }

    const membership = await this.attempt(() =>
      this.deps.memberships.findById(toMembershipId(context.membershipId)),
    );
    if (!membership || membership.state !== 'ACTIVE' || membership.userId !== actor.userId) {
      throw new SchoolContextError('SC-002');
    }
    if (membership.schoolId !== toSchoolId(context.schoolId)) {
      throw new SchoolContextError('SC-003');
    }
    if (input.resourceSchoolId !== undefined && input.resourceSchoolId !== membership.schoolId) {
      throw new SchoolContextError('SC-003');
    }

    return {
      result: 'VALID',
      userId: membership.userId,
      schoolId: membership.schoolId,
      membershipId: membership.id,
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

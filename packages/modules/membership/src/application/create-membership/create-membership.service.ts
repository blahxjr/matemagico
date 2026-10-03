import { SchoolMembership } from '../../domain/entities/school-membership';
import type { SchoolMembershipRepository } from '../../domain/repositories/school-membership.repository';
import { schoolId as toSchoolId, userId as toUserId } from '../../domain/value-objects/identifiers';
import { MembershipError } from '../errors/membership-error';
import type {
  ActorAuthorizer,
  ActorContext,
  Clock,
  MembershipIdGenerator,
  SchoolDirectory,
  UserDirectory,
} from '../ports/ports';

export interface CreateMembershipInput {
  readonly userId: string;
  readonly schoolId: string;
  readonly actor: ActorContext | null | undefined;
}

export interface CreateMembershipOutput {
  readonly membershipId: string;
  readonly userId: string;
  readonly schoolId: string;
  readonly state: 'PENDING';
}

export interface CreateMembershipDependencies {
  readonly memberships: SchoolMembershipRepository;
  readonly actorAuthorizer: ActorAuthorizer;
  readonly users: UserDirectory;
  readonly schools: SchoolDirectory;
  readonly clock: Clock;
  readonly membershipIds: MembershipIdGenerator;
}

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim();

export class CreateMembershipService {
  constructor(private readonly deps: CreateMembershipDependencies) {}

  async execute(input: CreateMembershipInput): Promise<CreateMembershipOutput> {
    const actor = input?.actor;
    if (!actor || isBlank(actor.userId)) throw new MembershipError('MEM-005');
    if (isBlank(input.schoolId)) throw new MembershipError('MEM-003');
    if (isBlank(input.userId)) throw new MembershipError('MEM-002');

    // Authorize before revealing anything about User, School or existing Memberships.
    if (
      !(await this.attempt(
        () => this.deps.actorAuthorizer.canAdministerSchool(actor, input.schoolId),
        'MEM-005',
      ))
    ) {
      throw new MembershipError('MEM-005');
    }
    if (!(await this.attempt(() => this.deps.users.isActiveUser(input.userId), 'MEM-002'))) {
      throw new MembershipError('MEM-002');
    }
    if (!(await this.attempt(() => this.deps.schools.isEnabledSchool(input.schoolId), 'MEM-003'))) {
      throw new MembershipError('MEM-003');
    }

    const userId = toUserId(input.userId);
    const schoolId = toSchoolId(input.schoolId);

    const open = await this.attempt(
      () => this.deps.memberships.findOpenByUserAndSchool(userId, schoolId),
      'MEM-005',
    );
    if (open) throw new MembershipError('MEM-001');

    const membership = SchoolMembership.create({
      membershipId: this.deps.membershipIds.next(),
      userId,
      schoolId,
      createdAt: this.deps.clock.now(),
    });

    const result = await this.attempt(() => this.deps.memberships.add(membership), 'MEM-005');
    if (result !== 'CREATED') throw new MembershipError('MEM-001');

    return {
      membershipId: membership.id,
      userId: membership.userId,
      schoolId: membership.schoolId,
      state: 'PENDING',
    };
  }

  // Fail closed: any dependency failure is mapped to the contractual code, never to success.
  private async attempt<T>(operation: () => Promise<T>, code: MembershipError['code']): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new MembershipError(code);
    }
  }
}

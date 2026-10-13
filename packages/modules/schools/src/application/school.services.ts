import { School, normalizeSlug, type SchoolStatus } from '../domain/school';
import type {
  Clock,
  SchoolEventPublisher,
  SchoolIdGenerator,
  SchoolManagementAuthorizer,
  SchoolRepository,
} from '../domain/ports';
import { SchoolsError } from '../domain/schools-error';

export interface SchoolView {
  readonly schoolId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: SchoolStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const toView = (school: School): SchoolView => ({
  schoolId: school.id,
  name: school.name,
  slug: school.slug,
  status: school.status,
  createdAt: school.createdAt,
  updatedAt: school.updatedAt,
});

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof SchoolsError) throw error;
    throw new SchoolsError('SCH-004');
  }
}

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim();

/** Platform-level operation: there is no School yet to scope an actor to. */
export class CreateSchoolService {
  constructor(
    private readonly deps: {
      schools: SchoolRepository;
      events: SchoolEventPublisher;
      clock: Clock;
      ids: SchoolIdGenerator;
    },
  ) {}

  async execute(input: { name: string; slug: string }): Promise<SchoolView> {
    const now = this.deps.clock.now();
    const school = School.create({
      schoolId: this.deps.ids.next(),
      name: input?.name,
      slug: input?.slug,
      now,
    });

    const existing = await guard(() => this.deps.schools.findBySlug(school.slug));
    if (existing) throw new SchoolsError('SCH-003');
    const result = await guard(() => this.deps.schools.add(school));
    if (result === 'CONFLICT') throw new SchoolsError('SCH-003');

    // Event delivery is best effort until the outbox exists; the School is already persisted.
    await this.deps.events
      .publishSchoolCreated({ schoolId: school.id, occurredAt: now })
      .catch(() => undefined);
    return toView(school);
  }
}

export class GetSchoolService {
  constructor(private readonly deps: { schools: SchoolRepository }) {}

  async execute(input: { schoolId: string }): Promise<SchoolView> {
    if (isBlank(input?.schoolId)) throw new SchoolsError('SCH-001');
    const school = await guard(() => this.deps.schools.findById(input.schoolId));
    if (!school) throw new SchoolsError('SCH-002');
    return toView(school);
  }
}

export class FindSchoolBySlugService {
  constructor(private readonly deps: { schools: SchoolRepository }) {}

  async execute(input: { slug: string }): Promise<SchoolView> {
    const slug = normalizeSlug(input?.slug);
    const school = await guard(() => this.deps.schools.findBySlug(slug));
    if (!school) throw new SchoolsError('SCH-002');
    return toView(school);
  }
}

export class DeactivateSchoolService {
  constructor(
    private readonly deps: {
      schools: SchoolRepository;
      authorizer: SchoolManagementAuthorizer;
      clock: Clock;
    },
  ) {}

  async execute(input: {
    schoolId: string;
    actor: { userId: string } | null | undefined;
  }): Promise<SchoolView> {
    if (isBlank(input?.schoolId)) throw new SchoolsError('SCH-001');
    const actor = input.actor;
    if (!actor || isBlank(actor.userId)) throw new SchoolsError('SCH-005');

    const allowed = await guard(() => this.deps.authorizer.canManageSchool(actor, input.schoolId));
    if (!allowed) throw new SchoolsError('SCH-005');

    const school = await guard(() => this.deps.schools.findById(input.schoolId));
    if (!school) throw new SchoolsError('SCH-002');
    if (!school.isActive) return toView(school);
    const deactivated = school.deactivate(this.deps.clock.now());
    await guard(() => this.deps.schools.save(deactivated));
    return toView(deactivated);
  }
}

/** Public Schools contract consumed by other modules (Membership). */
export class SchoolDirectory {
  constructor(private readonly schools: SchoolRepository) {}

  async findSchoolById(schoolId: string): Promise<SchoolView | null> {
    const school = await this.schools.findById(schoolId);
    return school ? toView(school) : null;
  }

  async findSchoolBySlug(slug: string): Promise<SchoolView | null> {
    const school = await this.schools.findBySlug(normalizeSlug(slug));
    return school ? toView(school) : null;
  }

  async exists(schoolId: string): Promise<boolean> {
    return (await this.schools.findById(schoolId)) !== null;
  }

  /** Satisfies the Membership `SchoolDirectory` port. */
  async isEnabledSchool(schoolId: string): Promise<boolean> {
    const school = await this.schools.findById(schoolId);
    return school?.isActive ?? false;
  }
}

import type { School } from './school';

export type AddSchoolResult = 'CREATED' | 'CONFLICT';

export interface SchoolRepository {
  add(school: School): Promise<AddSchoolResult>;
  findById(schoolId: string): Promise<School | null>;
  /** Expects an already normalized slug. */
  findBySlug(slug: string): Promise<School | null>;
  save(school: School): Promise<void>;
}

export interface SchoolCreatedEvent {
  readonly schoolId: string;
  readonly occurredAt: Date;
}

export interface SchoolEventPublisher {
  publishSchoolCreated(event: SchoolCreatedEvent): Promise<void>;
}

/** Implemented by Membership's ActorAuthorizer (CanManageSchool). */
export interface SchoolManagementAuthorizer {
  canManageSchool(actor: { userId: string }, schoolId: string): Promise<boolean>;
}

export interface Clock {
  now(): Date;
}

export interface SchoolIdGenerator {
  next(): string;
}

export { School, normalizeSlug, SCHOOL_STATUSES } from './domain/school';
export type { SchoolSnapshot, SchoolStatus } from './domain/school';
export { SchoolsError } from './domain/schools-error';
export type { SchoolsErrorCode } from './domain/schools-error';
export type {
  AddSchoolResult,
  Clock,
  SchoolCreatedEvent,
  SchoolEventPublisher,
  SchoolIdGenerator,
  SchoolManagementAuthorizer,
  SchoolRepository,
} from './domain/ports';
export {
  CreateSchoolService,
  DeactivateSchoolService,
  FindSchoolBySlugService,
  GetSchoolService,
  SchoolDirectory,
} from './application/school.services';
export type { SchoolView } from './application/school.services';
export { PrismaSchoolRepository } from './infrastructure/prisma-school.repository';
export { InMemorySchoolRepository } from './infrastructure/in-memory-school.repository';

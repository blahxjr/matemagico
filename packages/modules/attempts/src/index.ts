export { Attempt, AttemptsError, ATTEMPT_STATUSES, AutoCorrect } from './domain/attempt';
export type {
  AttemptAnswer,
  AttemptCompletedPayload,
  AttemptQuestionSnapshot,
  AttemptResult,
  AttemptSnapshot,
  AttemptSnapshotState,
  AttemptStatus,
  OutboxEvent,
  StatBreakdown,
} from './domain/attempt';
export {
  StartAttempt,
  SubmitAnswer,
  FinishAttempt,
  ExpireAttempt,
  GetAttempt,
  GetAttemptHistory,
  GetSchoolPerformance,
} from './application/attempt.services';
export type { StudentPerformance, TopicPerformance } from './application/attempt.services';
export { PrismaAttemptRepository } from './infrastructure/prisma-attempt.repository';
export type { AttemptIdGenerator, AttemptRepository, Clock } from './domain/ports';

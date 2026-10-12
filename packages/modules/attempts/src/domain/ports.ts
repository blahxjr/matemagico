import type { Attempt, AttemptSnapshotState } from './attempt';

export interface Clock {
  now(): Date;
}
export interface AttemptIdGenerator {
  next(): string;
}
export interface AttemptRepository {
  start(attempt: Attempt): Promise<AttemptSnapshotState>;
  findById(input: {
    attemptId: string;
    schoolId: string;
    userId: string;
  }): Promise<AttemptSnapshotState | null>;
  saveAnswer(attempt: Attempt): Promise<AttemptSnapshotState>;
  finish(attempt: Attempt): Promise<AttemptSnapshotState>;
}

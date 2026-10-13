import type { RankingEntry } from './ranking';

export interface RankingRepository {
  /** Idempotent: the attempt is the natural key, a replay updates the same row. */
  upsertByAttempt(entry: RankingEntry): Promise<void>;
  listBySchool(schoolId: string): Promise<readonly RankingEntry[]>;
  listByExam(schoolId: string, examId: string): Promise<readonly RankingEntry[]>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

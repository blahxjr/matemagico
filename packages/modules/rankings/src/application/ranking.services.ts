import { randomUUID } from 'node:crypto';
import { RankingsError, rankExam, rankSchool } from '../domain/ranking';
import type { RankedItem, RankingEntry } from '../domain/ranking';
import type { Clock, IdGenerator, RankingRepository } from '../domain/ports';

export interface AttemptCompletedInput {
  readonly attemptId: string;
  readonly examId: string;
  readonly userId: string;
  readonly schoolId: string;
  readonly score: number;
  readonly correctAnswers: number;
  readonly timeSpentSeconds: number;
  readonly completedAt: Date;
  readonly status: string;
}

const systemClock: Clock = { now: () => new Date() };
const uuidGenerator: IdGenerator = { next: () => randomUUID() };

/** Only COMPLETED (submitted) attempts rank; replays of the same attempt never duplicate. */
export class UpdateRankingFromAttemptCompleted {
  constructor(
    private readonly repository: RankingRepository,
    private readonly clock: Clock = systemClock,
    private readonly ids: IdGenerator = uuidGenerator,
  ) {}

  async execute(input: AttemptCompletedInput): Promise<{ ranked: boolean }> {
    if (input.status !== 'SUBMITTED' && input.status !== 'COMPLETED') return { ranked: false };
    if (!Number.isFinite(input.score) || input.correctAnswers < 0 || input.timeSpentSeconds < 0) {
      throw new RankingsError('RNK-001');
    }
    const now = this.clock.now();
    const entry: RankingEntry = {
      id: this.ids.next(),
      schoolId: input.schoolId,
      examId: input.examId,
      studentId: input.userId,
      attemptId: input.attemptId,
      score: input.score,
      correctAnswers: input.correctAnswers,
      timeSpentSeconds: input.timeSpentSeconds,
      completedAt: input.completedAt,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.upsertByAttempt(entry);
    return { ranked: true };
  }
}

/** Adapter of the AttemptCompleted event (outbox) onto the projection use case. */
export class RankingProjectionHandler {
  constructor(private readonly update: Pick<UpdateRankingFromAttemptCompleted, 'execute'>) {}

  handle(event: AttemptCompletedInput): Promise<{ ranked: boolean }> {
    return this.update.execute(event);
  }
}

export class GetSchoolRanking {
  constructor(private readonly repository: RankingRepository) {}

  async execute(input: { schoolId: string }): Promise<{ items: RankedItem[] }> {
    return { items: rankSchool(await this.repository.listBySchool(input.schoolId)) };
  }
}

export class GetExamRanking {
  constructor(private readonly repository: RankingRepository) {}

  async execute(input: { schoolId: string; examId: string }): Promise<{ items: RankedItem[] }> {
    return { items: rankExam(await this.repository.listByExam(input.schoolId, input.examId)) };
  }
}

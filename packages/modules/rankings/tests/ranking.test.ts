import { describe, expect, it } from 'vitest';
import { RankingProjectionHandler, UpdateRankingFromAttemptCompleted } from '../src';
import type { AttemptCompletedInput, RankingEntry, RankingRepository } from '../src';
import { GetExamRanking, GetSchoolRanking } from '../src';

class MemoryRepo implements RankingRepository {
  readonly rows = new Map<string, RankingEntry>();
  async upsertByAttempt(entry: RankingEntry) {
    const current = this.rows.get(entry.attemptId);
    this.rows.set(
      entry.attemptId,
      current ? { ...entry, id: current.id, createdAt: current.createdAt } : entry,
    );
  }
  async listBySchool(schoolId: string) {
    return [...this.rows.values()].filter((r) => r.schoolId === schoolId);
  }
  async listByExam(schoolId: string, examId: string) {
    return [...this.rows.values()].filter((r) => r.schoolId === schoolId && r.examId === examId);
  }
}

let seq = 0;
const event = (over: Partial<AttemptCompletedInput> = {}): AttemptCompletedInput => ({
  attemptId: `a${++seq}`,
  examId: 'e1',
  userId: 'u1',
  schoolId: 's1',
  score: 80,
  correctAnswers: 8,
  timeSpentSeconds: 600,
  completedAt: new Date('2026-01-01T10:00:00Z'),
  status: 'SUBMITTED',
  ...over,
});

function setup() {
  const repo = new MemoryRepo();
  const handler = new RankingProjectionHandler(new UpdateRankingFromAttemptCompleted(repo));
  return { repo, handler, school: new GetSchoolRanking(repo), exam: new GetExamRanking(repo) };
}

describe('ranking projection', () => {
  it('is idempotent for duplicated and reprocessed events', async () => {
    const { repo, handler } = setup();
    const e = event();
    await handler.handle(e);
    await handler.handle(e);
    await handler.handle({ ...e, score: 90 });
    expect(repo.rows.size).toBe(1);
    expect([...repo.rows.values()][0]?.score).toBe(90);
  });

  it('ignores attempts that are not completed', async () => {
    const { repo, handler } = setup();
    expect(await handler.handle(event({ status: 'EXPIRED' }))).toEqual({ ranked: false });
    expect(repo.rows.size).toBe(0);
  });

  it('orders by score, correct answers, time and completion', async () => {
    const { handler, exam } = setup();
    await handler.handle(event({ userId: 'low', score: 50 }));
    await handler.handle(
      event({ userId: 'slow', score: 90, correctAnswers: 9, timeSpentSeconds: 900 }),
    );
    await handler.handle(
      event({ userId: 'fast', score: 90, correctAnswers: 9, timeSpentSeconds: 300 }),
    );
    await handler.handle(
      event({ userId: 'more', score: 90, correctAnswers: 10, timeSpentSeconds: 999 }),
    );
    const { items } = await exam.execute({ schoolId: 's1', examId: 'e1' });
    expect(items.map((i) => i.studentId)).toEqual(['more', 'fast', 'slow', 'low']);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4]);
  });

  it('breaks ties by completedAt and shares a position on full ties', async () => {
    const { handler, exam } = setup();
    await handler.handle(event({ userId: 'late', completedAt: new Date('2026-01-02T00:00:00Z') }));
    await handler.handle(event({ userId: 'early' }));
    await handler.handle(event({ userId: 'twin' }));
    const { items } = await exam.execute({ schoolId: 's1', examId: 'e1' });
    expect(items.map((i) => [i.studentId, i.position])).toEqual([
      ['early', 1],
      ['twin', 1],
      ['late', 3],
    ]);
  });

  it('school ranking averages a student across exams and isolates schools', async () => {
    const { handler, school } = setup();
    await handler.handle(event({ userId: 'u1', examId: 'e1', score: 100 }));
    await handler.handle(event({ userId: 'u1', examId: 'e2', score: 60 }));
    await handler.handle(event({ userId: 'u2', schoolId: 's2', score: 100 }));
    const { items } = await school.execute({ schoolId: 's1' });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ studentId: 'u1', score: 80, attempts: 2, position: 1 });
  });
});

export class RankingsError extends Error {
  constructor(readonly code: 'RNK-001' | 'RNK-002') {
    super(code);
    this.name = 'RankingsError';
  }
}

export interface RankingEntry {
  readonly id: string;
  readonly schoolId: string;
  readonly examId: string;
  readonly studentId: string;
  readonly attemptId: string;
  readonly score: number;
  readonly correctAnswers: number;
  readonly timeSpentSeconds: number;
  readonly completedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface RankedItem {
  readonly position: number;
  readonly studentId: string;
  readonly score: number;
  readonly correctAnswers: number;
  readonly timeSpentSeconds: number;
  readonly completedAt: Date;
  /** Completed attempts that contribute to the row (always 1 in an exam ranking). */
  readonly attempts: number;
}

type Comparable = Pick<
  RankedItem,
  'score' | 'correctAnswers' | 'timeSpentSeconds' | 'completedAt' | 'studentId'
>;

/** score DESC, correctAnswers DESC, timeSpentSeconds ASC, completedAt ASC. */
export function compareRanking(a: Comparable, b: Comparable): number {
  return (
    b.score - a.score ||
    b.correctAnswers - a.correctAnswers ||
    a.timeSpentSeconds - b.timeSpentSeconds ||
    a.completedAt.getTime() - b.completedAt.getTime()
  );
}

/** Rows equal on every criterion share a position (1, 1, 3); the studentId only keeps order stable. */
function assignPositions(rows: readonly Omit<RankedItem, 'position'>[]): RankedItem[] {
  const sorted = [...rows].sort(
    (a, b) => compareRanking(a, b) || a.studentId.localeCompare(b.studentId),
  );
  let position = 0;
  return sorted.map((row, index) => {
    const previous = sorted[index - 1];
    if (!previous || compareRanking(previous, row) !== 0) position = index + 1;
    return { ...row, position };
  });
}

export function rankExam(entries: readonly RankingEntry[]): RankedItem[] {
  const best = new Map<string, RankingEntry>();
  for (const entry of entries) {
    const current = best.get(entry.studentId);
    if (!current || compareRanking(entry, current) < 0) best.set(entry.studentId, entry);
  }
  return assignPositions(
    [...best.values()].map((entry) => ({
      studentId: entry.studentId,
      score: entry.score,
      correctAnswers: entry.correctAnswers,
      timeSpentSeconds: entry.timeSpentSeconds,
      completedAt: entry.completedAt,
      attempts: 1,
    })),
  );
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** School ranking: per student, mean score; totals for correct answers and time; latest completion. */
export function rankSchool(entries: readonly RankingEntry[]): RankedItem[] {
  const byStudent = new Map<string, RankingEntry[]>();
  for (const entry of entries) {
    byStudent.set(entry.studentId, [...(byStudent.get(entry.studentId) ?? []), entry]);
  }
  return assignPositions(
    [...byStudent.entries()].map(([studentId, items]) => ({
      studentId,
      score: round2(items.reduce((sum, item) => sum + item.score, 0) / items.length),
      correctAnswers: items.reduce((sum, item) => sum + item.correctAnswers, 0),
      timeSpentSeconds: items.reduce((sum, item) => sum + item.timeSpentSeconds, 0),
      completedAt: new Date(Math.max(...items.map((item) => item.completedAt.getTime()))),
      attempts: items.length,
    })),
  );
}

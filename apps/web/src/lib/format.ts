import type { Attempt, AttemptResult, ExamQuestion, StatBreakdown } from './exam-types';

const TIME_ZONE = 'America/Sao_Paulo';

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

export function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

/** mm:ss, or h:mm:ss when longer than one hour. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function timeSpentSeconds(attempt: Pick<Attempt, 'startedAt' | 'submittedAt'>): number {
  if (!attempt.submittedAt) return 0;
  return Math.max(
    0,
    Math.round((Date.parse(attempt.submittedAt) - Date.parse(attempt.startedAt)) / 1000),
  );
}

export const LEVEL_LABELS: Record<string, string> = {
  OBMEP_MIRIM: 'OBMEP Mirim',
  OBMEP_N1: 'OBMEP Nível 1',
  OBMEP_N2: 'OBMEP Nível 2',
  OBMEP_N3: 'OBMEP Nível 3',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: 'Fácil',
  MEDIUM: 'Média',
  HARD: 'Difícil',
};

export const levelLabel = (level: string | null | undefined) =>
  (level && LEVEL_LABELS[level]) || level || '—';

export const difficultyLabel = (difficulty: string | null | undefined) =>
  (difficulty && DIFFICULTY_LABELS[difficulty]) || difficulty || '—';

export function answeredMap(attempt: Pick<Attempt, 'answers'>): Record<string, string> {
  return Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.selectedOption]));
}

/** Breakdown by question level, derived from the review data revealed after the attempt ends. */
export function levelBreakdown(
  questions: readonly ExamQuestion[],
  answers: Readonly<Record<string, string>>,
): Record<string, StatBreakdown> {
  const out: Record<string, StatBreakdown> = {};
  for (const question of questions) {
    const key = question.level ?? 'UNKNOWN';
    const item = (out[key] ??= {
      correctAnswers: 0,
      wrongAnswers: 0,
      totalQuestions: 0,
      percentage: 0,
    });
    item.totalQuestions += 1;
    if (question.correctOption && answers[question.questionId] === question.correctOption) {
      item.correctAnswers += 1;
    } else {
      item.wrongAnswers += 1;
    }
  }
  for (const item of Object.values(out)) {
    item.percentage = Number(((item.correctAnswers / item.totalQuestions) * 100).toFixed(2));
  }
  return out;
}

export type { AttemptResult };

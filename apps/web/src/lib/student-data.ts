import { redirect } from 'next/navigation';
import { apiRequest } from './api';
import type { ApiResult } from './api';
import type { Attempt, ExamSummary } from './exam-types';
import { getSessionToken, getSessionUser } from './session';
import type { SessionUser } from './session';

export interface StudentContext {
  user: SessionUser;
  token: string;
  schoolId: string | null;
}

/** Server-only. The School Context is the user's first membership; identity always comes from the Session. */
export async function requireContext(): Promise<StudentContext> {
  const { user } = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) redirect('/login');
  return { user, token, schoolId: user.schools[0]?.schoolId ?? null };
}

const q = (schoolId: string, extra: Record<string, string> = {}) =>
  `?${new URLSearchParams({ schoolId, ...extra }).toString()}`;

export function fetchExams(ctx: StudentContext & { schoolId: string }) {
  return apiRequest<{ items: ExamSummary[] }>(`/exams${q(ctx.schoolId)}`, { token: ctx.token });
}

export function fetchHistory(ctx: StudentContext & { schoolId: string }, examId?: string) {
  return apiRequest<{ items: Attempt[] }>(
    `/attempts/history${q(ctx.schoolId, examId ? { examId } : {})}`,
    { token: ctx.token },
  );
}

export function fetchAttempt(
  ctx: StudentContext & { schoolId: string },
  attemptId: string,
): Promise<ApiResult<Attempt>> {
  return apiRequest<Attempt>(`/attempts/${encodeURIComponent(attemptId)}${q(ctx.schoolId)}`, {
    token: ctx.token,
  });
}

export async function fetchTopicNames(
  ctx: StudentContext & { schoolId: string },
): Promise<Record<string, string>> {
  const result = await apiRequest<{ items: { topicId: string; name: string }[] }>('/topics', {
    token: ctx.token,
  });
  return Object.fromEntries((result.data?.items ?? []).map((t) => [t.topicId, t.name]));
}

export const sortByRecent = (items: readonly Attempt[]) =>
  [...items].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

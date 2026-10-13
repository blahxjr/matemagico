import { apiRequest } from './api';
import type { ApiResult } from './api';
import type { ExamSummary } from './exam-types';
import type { StudentContext } from './student-data';

export interface SchoolMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  state: string;
  roles: string[];
}

export interface RankingRow {
  position: number;
  studentId: string;
  score: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  completedAt: string;
  attempts: number;
}

export interface StudentPerformanceRow {
  studentId: string;
  attempts: number;
  averageScore: number;
  lastScore: number;
  lastAttemptAt: string | null;
}

export interface TopicPerformanceRow {
  topicId: string;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
}

type Scoped = StudentContext & { schoolId: string };
const q = (schoolId: string, extra: Record<string, string> = {}) =>
  `?${new URLSearchParams({ schoolId, ...extra }).toString()}`;

export const fetchMembers = (ctx: Scoped): Promise<ApiResult<{ items: SchoolMember[] }>> =>
  apiRequest(`/memberships${q(ctx.schoolId)}`, { token: ctx.token });

export const fetchAdminExams = (ctx: Scoped): Promise<ApiResult<{ items: ExamSummary[] }>> =>
  apiRequest(`/exams${q(ctx.schoolId, { includeDrafts: 'true' })}`, { token: ctx.token });

export const fetchSchoolRanking = (ctx: Scoped): Promise<ApiResult<{ items: RankingRow[] }>> =>
  apiRequest(`/rankings/school${q(ctx.schoolId)}`, { token: ctx.token });

export const fetchExamRanking = (
  ctx: Scoped,
  examId: string,
): Promise<ApiResult<{ items: RankingRow[] }>> =>
  apiRequest(`/rankings/exams/${encodeURIComponent(examId)}${q(ctx.schoolId)}`, {
    token: ctx.token,
  });

export const fetchPerformance = (
  ctx: Scoped,
): Promise<ApiResult<{ students: StudentPerformanceRow[]; topics: TopicPerformanceRow[] }>> =>
  apiRequest(`/performance/school${q(ctx.schoolId)}`, { token: ctx.token });

export const fetchTopicOptions = (
  ctx: Scoped,
): Promise<ApiResult<{ items: { topicId: string; name: string }[] }>> =>
  apiRequest('/topics', { token: ctx.token });

/** Roles a member does not have yet, in grant order. */
export const MEMBER_ROLES = ['STUDENT', 'TEACHER', 'SCHOOL_ADMIN'] as const;

export const memberName = (members: readonly SchoolMember[], userId: string) =>
  members.find((member) => member.userId === userId)?.name ?? userId;

import { NextResponse } from 'next/server';
import {
  fieldErrors,
  finishAttemptSchema,
  startAttemptSchema,
  submitAnswerSchema,
} from '@matemagico/validation';
import { apiRequest } from './api';
import { SESSION_COOKIE } from './config';
import { messageForError } from './errors';
import type { SessionUser } from './session';

function fail(status: number, code: string, fields?: Record<string, string>) {
  return NextResponse.json({ error: { code, message: messageForError(code), fields } }, { status });
}

function tokenFrom(request: Request): string | null {
  const header = request.headers.get('cookie') ?? '';
  return new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(header)?.[1] ?? null;
}

async function schoolContext(
  token: string,
): Promise<{ error: NextResponse } | { schoolId: string }> {
  const me = await apiRequest<SessionUser>('/auth/me', { token });
  if (!me.data) return { error: fail(me.status === 503 ? 503 : 401, me.errorCode ?? 'AUTH-003') };
  const schoolId = me.data.schools[0]?.schoolId;
  if (!schoolId) return { error: fail(403, 'SC-002') };
  return { schoolId };
}

async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => ({}));
}

function relay<T>(result: Awaited<ReturnType<typeof apiRequest<T>>>, success = 200) {
  if (result.data) return NextResponse.json(result.data, { status: success });
  return fail(result.status, result.errorCode ?? 'ATT-006');
}

/** Starts (or idempotently resumes) an attempt. The School Context comes from the Session, never the client. */
export async function startAttemptHandler(request: Request, examId: string) {
  const token = tokenFrom(request);
  if (!token) return fail(401, 'AUTH-003');
  const ctx = await schoolContext(token);
  if ('error' in ctx) return ctx.error;
  const parsed = startAttemptSchema.safeParse({ schoolId: ctx.schoolId });
  if (!parsed.success) return fail(400, 'INVALID_REQUEST', fieldErrors(parsed.error));
  const result = await apiRequest(`/exams/${encodeURIComponent(examId)}/attempts`, {
    method: 'POST',
    token,
    body: parsed.data,
  });
  return relay(result, 201);
}

export async function submitAnswerHandler(request: Request, attemptId: string) {
  const token = tokenFrom(request);
  if (!token) return fail(401, 'AUTH-003');
  const ctx = await schoolContext(token);
  if ('error' in ctx) return ctx.error;
  const body = (await readJson(request)) as Record<string, unknown>;
  const parsed = submitAnswerSchema.safeParse({
    questionId: body.questionId,
    selectedOption: body.selectedOption,
    schoolId: ctx.schoolId,
  });
  if (!parsed.success) return fail(400, 'INVALID_REQUEST', fieldErrors(parsed.error));
  const result = await apiRequest(`/attempts/${encodeURIComponent(attemptId)}/answers`, {
    method: 'POST',
    token,
    body: parsed.data,
  });
  return relay(result);
}

export async function finishAttemptHandler(request: Request, attemptId: string) {
  const token = tokenFrom(request);
  if (!token) return fail(401, 'AUTH-003');
  const ctx = await schoolContext(token);
  if ('error' in ctx) return ctx.error;
  const parsed = finishAttemptSchema.safeParse({ schoolId: ctx.schoolId });
  if (!parsed.success) return fail(400, 'INVALID_REQUEST', fieldErrors(parsed.error));
  const result = await apiRequest(`/attempts/${encodeURIComponent(attemptId)}/finish`, {
    method: 'POST',
    token,
    body: parsed.data,
  });
  return relay(result);
}

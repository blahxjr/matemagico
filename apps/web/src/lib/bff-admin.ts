import { NextResponse } from 'next/server';
import {
  createExamSchema,
  fieldErrors,
  grantRoleSchema,
  updateExamSchema,
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

const readJson = (request: Request) => request.json().catch(() => ({}));

function relay<T>(result: Awaited<ReturnType<typeof apiRequest<T>>>, success = 200) {
  if (result.data) return NextResponse.json(result.data, { status: success });
  return fail(result.status, result.errorCode ?? 'INTERNAL_ERROR');
}

/** Resolves Session + School Context once; every admin call below authorizes again in the API. */
async function withContext(
  request: Request,
  run: (ctx: { token: string; schoolId: string }) => Promise<NextResponse>,
) {
  const token = tokenFrom(request);
  if (!token) return fail(401, 'AUTH-003');
  const ctx = await schoolContext(token);
  if ('error' in ctx) return ctx.error;
  return run({ token, schoolId: ctx.schoolId });
}

const enc = encodeURIComponent;

export function activateMembershipHandler(request: Request, membershipId: string) {
  return withContext(request, async ({ token }) =>
    relay(
      await apiRequest(`/memberships/${enc(membershipId)}/activate`, {
        method: 'POST',
        token,
        body: {},
      }),
    ),
  );
}

export function grantRoleHandler(request: Request, membershipId: string) {
  return withContext(request, async ({ token }) => {
    const parsed = grantRoleSchema.safeParse(await readJson(request));
    if (!parsed.success) return fail(400, 'INVALID_REQUEST', fieldErrors(parsed.error));
    return relay(
      await apiRequest(`/memberships/${enc(membershipId)}/grants`, {
        method: 'POST',
        token,
        body: parsed.data,
      }),
      201,
    );
  });
}

export function createExamHandler(request: Request) {
  return withContext(request, async ({ token, schoolId }) => {
    const parsed = createExamSchema.safeParse(await readJson(request));
    if (!parsed.success) return fail(400, 'INVALID_REQUEST', fieldErrors(parsed.error));
    return relay(
      await apiRequest('/exams', {
        method: 'POST',
        token,
        body: { ...parsed.data, schoolId, seed: crypto.randomUUID() },
      }),
      201,
    );
  });
}

export function updateExamHandler(request: Request, examId: string) {
  return withContext(request, async ({ token, schoolId }) => {
    const parsed = updateExamSchema.safeParse(await readJson(request));
    if (!parsed.success) return fail(400, 'INVALID_REQUEST', fieldErrors(parsed.error));
    return relay(
      await apiRequest(`/exams/${enc(examId)}`, {
        method: 'PATCH',
        token,
        body: { ...parsed.data, schoolId },
      }),
    );
  });
}

export function publishExamHandler(request: Request, examId: string) {
  return withContext(request, async ({ token, schoolId }) =>
    relay(
      await apiRequest(`/exams/${enc(examId)}/publish`, {
        method: 'POST',
        token,
        body: { schoolId },
      }),
    ),
  );
}

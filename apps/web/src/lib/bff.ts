import { NextResponse } from 'next/server';
import { loginSchema, registerSchema, fieldErrors } from '@matemagico/validation';
import { apiRequest } from './api';
import { SESSION_COOKIE } from './config';
import { messageForError } from './errors';

const COOKIE_MAX_AGE = 60 * 60 * 8;

const sessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge,
});

function fail(status: number, code: string, fields?: Record<string, string>) {
  return NextResponse.json({ error: { code, message: messageForError(code), fields } }, { status });
}

async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

export async function loginHandler(request: Request): Promise<NextResponse> {
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(400, 'INVALID_REQUEST', fieldErrors(parsed.error));

  const result = await apiRequest<{ sessionId: string }>('/auth/login', {
    method: 'POST',
    body: parsed.data,
  });
  if (!result.data) return fail(result.status === 503 ? 503 : 401, result.errorCode ?? 'AUTH-001');

  const response = NextResponse.json({ result: 'AUTHENTICATED' });
  response.cookies.set(SESSION_COOKIE, result.data.sessionId, sessionCookieOptions(COOKIE_MAX_AGE));
  return response;
}

export async function registerHandler(request: Request): Promise<NextResponse> {
  const parsed = registerSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(400, 'INVALID_REQUEST', fieldErrors(parsed.error));

  const result = await apiRequest('/auth/register', { method: 'POST', body: parsed.data });
  if (result.status !== 201) {
    return fail(result.status >= 500 ? 503 : 400, result.errorCode ?? 'AUTH-002');
  }
  return NextResponse.json({ result: 'REGISTERED' }, { status: 201 });
}

export async function logoutHandler(request: Request): Promise<NextResponse> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(cookieHeader)?.[1];
  if (token) await apiRequest('/auth/logout', { method: 'POST', token });

  const response = NextResponse.json({ result: 'REVOKED' });
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return response;
}

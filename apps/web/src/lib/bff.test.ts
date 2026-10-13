// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginHandler, logoutHandler, registerHandler } from './bff';
import { SESSION_COOKIE } from './config';

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://web.test/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function mockApi(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('BFF login', () => {
  it('sets an HttpOnly session cookie and never returns the token', async () => {
    mockApi(200, { result: 'AUTHENTICATED', sessionId: 'tok-123' });
    const response = await loginHandler(jsonRequest({ email: 'a@b.com', password: 'secret' }));
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(200);
    expect(setCookie).toContain(`${SESSION_COOKIE}=tok-123`);
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(JSON.stringify(await response.json())).not.toContain('tok-123');
  });

  it('maps API errors to messages without a cookie', async () => {
    mockApi(401, { error: { code: 'AUTH-001' } });
    const response = await loginHandler(jsonRequest({ email: 'a@b.com', password: 'bad' }));
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(body.error).toMatchObject({ code: 'AUTH-001', message: 'Credenciais inválidas.' });
  });

  it('rejects invalid payloads without calling the API', async () => {
    const fetchMock = mockApi(200, {});
    const response = await loginHandler(jsonRequest({ email: '', password: '' }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('BFF register', () => {
  it('registers a valid user', async () => {
    const fetchMock = mockApi(201, { userId: 'u1', email: 'a@b.com', name: 'Ana' });
    const response = await registerHandler(
      jsonRequest({ name: 'Ana', email: 'A@B.com', password: 'a-long-password-1' }),
    );

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns field errors for a short password', async () => {
    mockApi(201, {});
    const response = await registerHandler(
      jsonRequest({ name: 'Ana', email: 'a@b.com', password: 'short' }),
    );
    const body = (await response.json()) as { error: { fields: Record<string, string> } };

    expect(response.status).toBe(400);
    expect(body.error.fields.password).toBeTruthy();
  });

  it('surfaces API conflicts', async () => {
    mockApi(409, { error: { code: 'AUTH-002' } });
    const response = await registerHandler(
      jsonRequest({ name: 'Ana', email: 'a@b.com', password: 'a-long-password-1' }),
    );

    expect(response.status).toBe(400);
  });
});

describe('BFF logout', () => {
  it('revokes the session and clears the cookie', async () => {
    const fetchMock = mockApi(200, { result: 'REVOKED' });
    const response = await logoutHandler(jsonRequest({}, { cookie: `${SESSION_COOKIE}=tok-123` }));
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(fetchMock).toHaveBeenCalledOnce();
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok-123');
    expect(setCookie).toContain(`${SESSION_COOKIE}=;`);
    expect(setCookie).toMatch(/max-age=0/i);
  });
});

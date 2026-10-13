// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { finishAttemptHandler, startAttemptHandler, submitAnswerHandler } from './bff-attempts';
import { SESSION_COOKIE } from './config';

const SCHOOL = '11111111-1111-4111-8111-111111111111';
const QUESTION = '22222222-2222-4222-8222-222222222222';

function req(body: unknown = {}, cookie = true) {
  return new Request('http://web.test/api', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie: `${SESSION_COOKIE}=tok` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function mockApi(attemptStatus = 200, attemptBody: unknown = { attemptId: 'a1' }) {
  const fetchMock = vi.fn(async (...args: [string | URL | Request, RequestInit?]) => {
    const url = args[0];
    if (String(url).endsWith('/auth/me')) {
      return new Response(JSON.stringify({ schools: [{ schoolId: SCHOOL }] }), { status: 200 });
    }
    return new Response(JSON.stringify(attemptBody), { status: attemptStatus });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('BFF attempts', () => {
  it('requires a session cookie', async () => {
    const fetchMock = mockApi();
    const response = await startAttemptHandler(req({}, false), 'e1');
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('starts an attempt using the school from the session', async () => {
    const fetchMock = mockApi(201);
    const response = await startAttemptHandler(req(), 'e1');
    expect(response.status).toBe(201);
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/exams/e1/attempts'));
    expect(JSON.parse(String((call?.[1] as RequestInit).body))).toEqual({ schoolId: SCHOOL });
  });

  it('submits an answer', async () => {
    mockApi();
    const response = await submitAnswerHandler(
      req({ questionId: QUESTION, selectedOption: 'A' }),
      'a1',
    );
    expect(response.status).toBe(200);
  });

  it('rejects invalid answers without calling the attempt endpoint', async () => {
    const fetchMock = mockApi();
    const response = await submitAnswerHandler(req({ questionId: 'x' }), 'a1');
    expect(response.status).toBe(400);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/answers'))).toBe(false);
  });

  it('relays API errors with a mapped message', async () => {
    mockApi(404, { error: { code: 'ATT-002' } });
    const response = await finishAttemptHandler(req(), 'a1');
    const body = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(404);
    expect(body.error.code).toBe('ATT-002');
  });
});

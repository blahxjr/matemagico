import { describe, expect, it } from 'vitest';
import {
  ABSOLUTE_SESSION_LIFETIME_MS,
  IDLE_SESSION_LIFETIME_MS,
} from '../../domain/entities/session';
import { createHarness, login, START } from '../authenticate-user/test-support';

async function setup() {
  const h = createHarness();
  h.provision('ana@example.com', 'user-1');
  const { sessionId } = await login(h.service);
  return { h, sessionId };
}

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'NO_ERROR',
    (error: { code?: string }) => error.code ?? 'UNEXPECTED',
  );

describe('GetSessionService', () => {
  it('returns the permitted attributes for a valid Session', async () => {
    const { h, sessionId } = await setup();

    const output = await h.getSession.execute({ sessionId });

    expect(output).toEqual({
      state: 'VALID',
      sessionId,
      userId: 'user-1',
      createdAt: START,
      lastSeenAt: START,
      absoluteExpiresAt: new Date(START.getTime() + ABSOLUTE_SESSION_LIFETIME_MS),
      idleExpiresAt: new Date(START.getTime() + IDLE_SESSION_LIFETIME_MS),
    });
  });

  it('rejects unknown, idle-expired and absolute-expired Sessions as AUTH-003 (AT-004)', async () => {
    const { h, sessionId } = await setup();

    expect(await codeOf(h.getSession.execute({ sessionId: 'unknown' }))).toBe('AUTH-003');

    h.state.now = new Date(START.getTime() + IDLE_SESSION_LIFETIME_MS);
    expect(await codeOf(h.getSession.execute({ sessionId }))).toBe('AUTH-003');

    h.state.now = new Date(START.getTime() + ABSOLUTE_SESSION_LIFETIME_MS);
    expect(await codeOf(h.getSession.execute({ sessionId }))).toBe('AUTH-003');
  });

  it('rejects a Session whose User is no longer ACTIVE', async () => {
    const { h, sessionId } = await setup();
    h.users.byEmail.set('ana@example.com', { userId: 'user-1', status: 'SUSPENDED' });

    expect(await codeOf(h.getSession.execute({ sessionId }))).toBe('AUTH-003');
  });

  it('rejects missing input as AUTH-005 and unavailable dependencies as AUTH-004', async () => {
    const { h, sessionId } = await setup();

    expect(await codeOf(h.getSession.execute({ sessionId: ' ' }))).toBe('AUTH-005');

    h.sessions.failFind = true;
    expect(await codeOf(h.getSession.execute({ sessionId }))).toBe('AUTH-004');
    h.sessions.failFind = false;

    h.users.failing = true;
    expect(await codeOf(h.getSession.execute({ sessionId }))).toBe('AUTH-004');
  });
});

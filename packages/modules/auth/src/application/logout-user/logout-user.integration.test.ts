import { describe, expect, it } from 'vitest';
import { createHarness, login, START } from '../authenticate-user/test-support';

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'NO_ERROR',
    (error: { code?: string }) => error.code ?? 'UNEXPECTED',
  );

describe('Logout / RevokeSession integration (CP-AUTH-003)', () => {
  it('RS-006 / CT-004: Login → GetSession → Logout → GetSession fails with AUTH-003', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    const { sessionId } = await login(h.service);
    await expect(h.getSession.execute({ sessionId })).resolves.toMatchObject({
      state: 'VALID',
      userId: 'user-1',
    });

    h.state.now = new Date(START.getTime() + 60_000);
    await expect(h.logout.execute({ currentSessionId: sessionId })).resolves.toMatchObject({
      result: 'REVOKED',
      sessionId,
    });

    expect(await codeOf(h.getSession.execute({ sessionId }))).toBe('AUTH-003');
  });

  it('RevokeSession followed by GetSession is rejected, and later revocation attempts never reuse the Session', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');
    const { sessionId } = await login(h.service);

    await h.revokeSession.execute({ sessionId, currentSessionId: sessionId });

    expect(await codeOf(h.getSession.execute({ sessionId }))).toBe('AUTH-003');
    expect(await codeOf(h.revokeSession.execute({ sessionId, currentSessionId: sessionId }))).toBe(
      'AUTH-003',
    );
    expect(await codeOf(h.logout.execute({ currentSessionId: sessionId }))).toBe('AUTH-003');
  });

  it('Logout frees a slot: the User can log in again and gets a new valid Session', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');
    const first = (await login(h.service)).sessionId;
    await h.logout.execute({ currentSessionId: first });

    h.state.now = new Date(START.getTime() + 1000);
    const second = (await login(h.service)).sessionId;

    expect(second).not.toBe(first);
    await expect(h.getSession.execute({ sessionId: second })).resolves.toMatchObject({
      state: 'VALID',
    });
    expect(await codeOf(h.getSession.execute({ sessionId: first }))).toBe('AUTH-003');
  });

  it('keeps Sessions valid when revocation cannot be verified (fail closed, nothing revoked)', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');
    const { sessionId } = await login(h.service);

    h.users.failing = true;
    expect(await codeOf(h.logout.execute({ currentSessionId: sessionId }))).toBe('AUTH-004');
    expect(await codeOf(h.getSession.execute({ sessionId }))).toBe('AUTH-004');
    h.users.failing = false;

    expect(h.sessions.store.get(sessionId)!.revokedAt).toBeNull();
    await expect(h.getSession.execute({ sessionId })).resolves.toMatchObject({ state: 'VALID' });
  });
});

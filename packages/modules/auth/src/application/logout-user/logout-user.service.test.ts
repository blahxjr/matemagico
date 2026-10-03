import { describe, expect, it } from 'vitest';
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

describe('LogoutUserService', () => {
  it('RS-005 / AT-005: revokes the current Session and confirms sessionId and revokedAt', async () => {
    const { h, sessionId } = await setup();
    h.state.now = new Date(START.getTime() + 60_000);

    const output = await h.logout.execute({ currentSessionId: sessionId });

    expect(output).toEqual({ result: 'REVOKED', sessionId, revokedAt: h.state.now });
    const stored = h.sessions.store.get(sessionId)!;
    expect(stored.revokedAt).toEqual(h.state.now);
    expect(stored.revocationReason).toBe('LOGOUT');
    expect(stored.isActiveAt(h.state.now)).toBe(false);
  });

  it('revokes only the current Session, not other Sessions of the same User', async () => {
    const { h, sessionId } = await setup();
    h.state.now = new Date(START.getTime() + 1000);
    const other = (await login(h.service)).sessionId;

    await h.logout.execute({ currentSessionId: sessionId });

    expect(h.sessions.store.get(other)!.revokedAt).toBeNull();
    await expect(h.getSession.execute({ sessionId: other })).resolves.toMatchObject({
      state: 'VALID',
    });
  });

  it('a second Logout of the same Session is rejected without changing revokedAt', async () => {
    const { h, sessionId } = await setup();
    await h.logout.execute({ currentSessionId: sessionId });
    const revokedAt = h.sessions.store.get(sessionId)!.revokedAt;

    h.state.now = new Date(START.getTime() + 5000);
    expect(await codeOf(h.logout.execute({ currentSessionId: sessionId }))).toBe('AUTH-003');
    expect(h.sessions.store.get(sessionId)!.revokedAt).toEqual(revokedAt);
  });

  it('rejects a missing context or unknown/expired Session as AUTH-003', async () => {
    const { h, sessionId } = await setup();

    expect(await codeOf(h.logout.execute({ currentSessionId: '' }))).toBe('AUTH-003');
    expect(await codeOf(h.logout.execute(undefined as never))).toBe('AUTH-003');
    expect(await codeOf(h.logout.execute({ currentSessionId: 'unknown' }))).toBe('AUTH-003');

    h.state.now = new Date(START.getTime() + 31 * 60 * 1000);
    expect(await codeOf(h.logout.execute({ currentSessionId: sessionId }))).toBe('AUTH-003');
  });

  it('fails closed with AUTH-004 when validation or persistence is unavailable', async () => {
    const { h, sessionId } = await setup();

    h.sessions.failFind = true;
    expect(await codeOf(h.logout.execute({ currentSessionId: sessionId }))).toBe('AUTH-004');
    h.sessions.failFind = false;

    h.sessions.failRevoke = true;
    expect(await codeOf(h.logout.execute({ currentSessionId: sessionId }))).toBe('AUTH-004');
    expect(h.sessions.store.get(sessionId)!.revokedAt).toBeNull();
  });
});

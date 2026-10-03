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

describe('RevokeSessionService', () => {
  it('RS-001: revokes a valid current Session and returns REVOKED', async () => {
    const { h, sessionId } = await setup();
    h.state.now = new Date(START.getTime() + 60_000);

    const output = await h.revokeSession.execute({ sessionId, currentSessionId: sessionId });

    expect(output).toEqual({ result: 'REVOKED', sessionId, revokedAt: h.state.now });
    expect(h.sessions.store.get(sessionId)!.revokedAt).toEqual(h.state.now);
    expect(h.sessions.store.get(sessionId)!.revocationReason).toBe('REVOKE_SESSION');
  });

  it('RS-002: a Session already revoked is never revoked twice and keeps its original revokedAt', async () => {
    const { h, sessionId } = await setup();
    h.state.now = new Date(START.getTime() + 60_000);
    await h.revokeSession.execute({ sessionId, currentSessionId: sessionId });
    const firstRevokedAt = h.sessions.store.get(sessionId)!.revokedAt;

    h.state.now = new Date(START.getTime() + 120_000);
    expect(await codeOf(h.revokeSession.execute({ sessionId, currentSessionId: sessionId }))).toBe(
      'AUTH-003',
    );

    expect(h.sessions.store.get(sessionId)!.revokedAt).toEqual(firstRevokedAt);
  });

  it('RS-003: an unknown Session is rejected as AUTH-003', async () => {
    const { h } = await setup();

    expect(
      await codeOf(h.revokeSession.execute({ sessionId: 'unknown', currentSessionId: 'unknown' })),
    ).toBe('AUTH-003');
  });

  it('RS-004: unavailable dependencies yield AUTH-004 and never confirm revocation', async () => {
    const { h, sessionId } = await setup();

    h.sessions.failFind = true;
    expect(await codeOf(h.revokeSession.execute({ sessionId, currentSessionId: sessionId }))).toBe(
      'AUTH-004',
    );
    h.sessions.failFind = false;

    h.users.failing = true;
    expect(await codeOf(h.revokeSession.execute({ sessionId, currentSessionId: sessionId }))).toBe(
      'AUTH-004',
    );
    h.users.failing = false;

    h.sessions.failRevoke = true;
    expect(await codeOf(h.revokeSession.execute({ sessionId, currentSessionId: sessionId }))).toBe(
      'AUTH-004',
    );
    expect(h.sessions.store.get(sessionId)!.revokedAt).toBeNull();
  });

  it('refuses a target different from the current Session and leaves both untouched', async () => {
    const { h, sessionId } = await setup();
    h.state.now = new Date(START.getTime() + 1000);
    const other = (await login(h.service)).sessionId;

    expect(
      await codeOf(h.revokeSession.execute({ sessionId: other, currentSessionId: sessionId })),
    ).toBe('AUTH-003');
    expect(h.sessions.store.get(sessionId)!.revokedAt).toBeNull();
    expect(h.sessions.store.get(other)!.revokedAt).toBeNull();
  });

  it('rejects an invalid or expired Session and a missing sessionId', async () => {
    const { h, sessionId } = await setup();

    expect(await codeOf(h.revokeSession.execute({ sessionId: '', currentSessionId: '' }))).toBe(
      'AUTH-005',
    );

    h.state.now = new Date(START.getTime() + 31 * 60 * 1000);
    expect(await codeOf(h.revokeSession.execute({ sessionId, currentSessionId: sessionId }))).toBe(
      'AUTH-003',
    );
  });

  it('does not confirm a revocation lost to a concurrent revocation', async () => {
    const { h, sessionId } = await setup();
    h.sessions.revoke = async () => false;

    expect(await codeOf(h.revokeSession.execute({ sessionId, currentSessionId: sessionId }))).toBe(
      'AUTH-003',
    );
  });
});

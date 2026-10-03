import { describe, expect, it } from 'vitest';
import { AuthenticateUserService } from '../authenticate-user/authenticate-user.service';
import { InMemoryLoginAttemptLimiter } from '../../infrastructure/rate-limit/in-memory-login-attempt-limiter';
import { createHarness, login, START } from '../authenticate-user/test-support';
import { HealthCheckAuthService } from '../health-check-auth/health-check-auth.service';

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'NO_ERROR',
    (error: { code?: string }) => error.code ?? 'UNEXPECTED',
  );

describe('Auth E2E (CP-AUTH-004)', () => {
  it('Login → GetSession → Logout → GetSession: AUTHENTICATED → VALID → REVOKED → AUTH-003', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    const loggedIn = await login(h.service);
    expect(loggedIn.result).toBe('AUTHENTICATED');

    h.state.now = new Date(START.getTime() + 60_000);
    const session = await h.getSession.execute({ sessionId: loggedIn.sessionId });
    expect(session.state).toBe('VALID');

    const loggedOut = await h.logout.execute({ currentSessionId: loggedIn.sessionId });
    expect(loggedOut.result).toBe('REVOKED');

    expect(await codeOf(h.getSession.execute({ sessionId: loggedIn.sessionId }))).toBe('AUTH-003');
  });

  it('HealthCheckAuth reflects the availability of the Auth dependencies', async () => {
    const h = createHarness();
    const health = new HealthCheckAuthService({
      probes: [
        { isAvailable: async () => !h.users.failing },
        { isAvailable: async () => !h.sessions.failFind },
      ],
    });
    expect(await health.execute()).toEqual({ state: 'READY' });
    h.users.failing = true;
    expect(await health.execute()).toEqual({ state: 'NOT_READY' });
    h.users.failing = false;
    h.sessions.failFind = true;
    expect(await health.execute()).toEqual({ state: 'NOT_READY' });
  });

  describe('fail closed: every required dependency unavailable yields AUTH-004', () => {
    it('Users unavailable', async () => {
      const h = createHarness();
      h.provision('ana@example.com', 'user-1');
      const { sessionId } = await login(h.service);
      h.users.failing = true;
      expect(await codeOf(login(h.service))).toBe('AUTH-004');
      expect(await codeOf(h.getSession.execute({ sessionId }))).toBe('AUTH-004');
      expect(await codeOf(h.logout.execute({ currentSessionId: sessionId }))).toBe('AUTH-004');
    });

    it('SessionRepository unavailable', async () => {
      const h = createHarness();
      h.provision('ana@example.com', 'user-1');
      const { sessionId } = await login(h.service);
      h.sessions.failFind = true;
      expect(await codeOf(h.getSession.execute({ sessionId }))).toBe('AUTH-004');
      h.sessions.failFind = false;
      h.sessions.failCreate = true;
      expect(await codeOf(login(h.service))).toBe('AUTH-004');
      h.sessions.failCreate = false;
      h.sessions.failRevoke = true;
      expect(await codeOf(h.logout.execute({ currentSessionId: sessionId }))).toBe('AUTH-004');
    });

    it('PasswordVerifier unavailable', async () => {
      const h = createHarness();
      h.provision('ana@example.com', 'user-1');
      h.verifier.failing = true;
      expect(await codeOf(login(h.service))).toBe('AUTH-004');
      expect(h.sessions.store.size).toBe(0);
    });

    it('RateLimiter unavailable', async () => {
      const h = createHarness();
      h.provision('ana@example.com', 'user-1');
      const limiter = new InMemoryLoginAttemptLimiter();
      limiter.isEmailBlocked = async () => {
        throw new Error('limiter down');
      };
      const service = new AuthenticateUserService({
        users: h.users,
        authAccounts: h.accounts,
        passwordCredentials: h.credentials,
        sessions: h.sessions,
        passwordVerifier: h.verifier,
        attemptLimiter: limiter,
        clock: { now: () => START },
        sessionIds: { next: () => 'x' },
      });
      expect(await codeOf(login(service))).toBe('AUTH-004');
      expect(h.sessions.store.size).toBe(0);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { AuthDomainError } from '../../domain/errors/auth-domain-error';
import {
  ABSOLUTE_SESSION_LIFETIME_MS,
  IDLE_SESSION_LIFETIME_MS,
} from '../../domain/entities/session';
import { AuthError } from '../errors/auth-error';
import { CORRECT_PASSWORD, START, createHarness, login } from './test-support';

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error instanceof AuthError ? error.code : 'UNEXPECTED';
  }
  return 'NO_ERROR';
};

describe('AuthenticateUserService', () => {
  it('creates a valid Session for a valid login (AT-001)', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    const output = await login(h.service);

    expect(output).toEqual({
      result: 'AUTHENTICATED',
      userId: 'user-1',
      sessionId: 'session-1',
      createdAt: START,
      absoluteExpiresAt: new Date(START.getTime() + ABSOLUTE_SESSION_LIFETIME_MS),
      idleExpiresAt: new Date(START.getTime() + IDLE_SESSION_LIFETIME_MS),
    });
    expect(h.sessions.store.get('session-1')?.isActiveAt(START)).toBe(true);
    expect(JSON.stringify(output)).not.toContain('argon2');
    expect(JSON.stringify(output)).not.toContain(CORRECT_PASSWORD);
  });

  it('normalizes the email before locating the User', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    await expect(login(h.service, { email: '  ANA@Example.com ' })).resolves.toMatchObject({
      userId: 'user-1',
    });
  });

  it('denies wrong password, unknown User and ineligible Users with the same generic error (AT-002, AT-003)', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');
    h.provision('sus@example.com', 'user-2', 'SUSPENDED');
    h.provision('pen@example.com', 'user-3', 'PENDING_EMAIL');

    const failures = await Promise.all([
      h.service
        .execute({ email: 'ana@example.com', password: 'wrong', clientIp: 'ip-a' })
        .catch((e) => e),
      h.service
        .execute({ email: 'nobody@example.com', password: 'x', clientIp: 'ip-b' })
        .catch((e) => e),
      h.service
        .execute({ email: 'sus@example.com', password: CORRECT_PASSWORD, clientIp: 'ip-c' })
        .catch((e) => e),
      h.service
        .execute({ email: 'pen@example.com', password: CORRECT_PASSWORD, clientIp: 'ip-d' })
        .catch((e) => e),
    ]);

    for (const failure of failures) {
      expect(failure).toBeInstanceOf(AuthError);
      expect(failure.code).toBe('AUTH-001');
      expect(failure.message).toBe(failures[0].message);
    }
    expect(h.sessions.store.size).toBe(0);
  });

  it('denies when the AuthAccount or PasswordCredential is missing or structurally invalid', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');
    h.accounts.byUserId.delete('user-1');
    expect(await codeOf(login(h.service))).toBe('AUTH-001');

    h.provision('ana@example.com', 'user-1');
    h.credentials.byAccountId.delete('account-user-1');
    expect(await codeOf(login(h.service))).toBe('AUTH-001');

    h.provision('ana@example.com', 'user-1');
    h.accounts.findByUserId = async () => {
      throw new AuthDomainError('malformed record');
    };
    expect(await codeOf(login(h.service))).toBe('AUTH-001');
    expect(h.sessions.store.size).toBe(0);
  });

  it('fails closed with AUTH-004 when a dependency is unavailable', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    h.users.failing = true;
    expect(await codeOf(login(h.service))).toBe('AUTH-004');
    h.users.failing = false;

    h.verifier.failing = true;
    expect(await codeOf(login(h.service))).toBe('AUTH-004');
    h.verifier.failing = false;

    h.sessions.failCreate = true;
    expect(await codeOf(login(h.service))).toBe('AUTH-004');
    expect(h.sessions.store.size).toBe(0);
  });

  it('rejects missing or invalid input with AUTH-005 without consuming limits', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    expect(await codeOf(login(h.service, { email: '' }))).toBe('AUTH-005');
    expect(await codeOf(login(h.service, { email: 'not-an-email' }))).toBe('AUTH-005');
    expect(await codeOf(login(h.service, { password: '' }))).toBe('AUTH-005');
    expect(await codeOf(login(h.service, { clientIp: ' ' }))).toBe('AUTH-005');
    expect(
      await codeOf(
        h.service.execute(undefined as unknown as Parameters<typeof h.service.execute>[0]),
      ),
    ).toBe('AUTH-005');
  });

  it('blocks an email after five failures in 15 minutes, even with the right password', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    for (let attempt = 0; attempt < 5; attempt++) {
      expect(await codeOf(login(h.service, { password: 'wrong' }))).toBe('AUTH-001');
    }
    expect(await codeOf(login(h.service))).toBe('AUTH-002');
    expect(h.sessions.store.size).toBe(0);

    h.state.now = new Date(START.getTime() + 15 * 60 * 1000 + 1);
    await expect(login(h.service)).resolves.toMatchObject({ result: 'AUTHENTICATED' });
  });

  it('refuses the 31st request from one IP in 15 minutes regardless of outcome', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    for (let request = 0; request < 30; request++) {
      await login(h.service, { email: `u${request}@example.com`, password: 'x' }).catch(
        () => undefined,
      );
    }
    expect(await codeOf(login(h.service))).toBe('AUTH-002');
    await expect(login(h.service, { clientIp: '10.0.0.2' })).resolves.toMatchObject({
      result: 'AUTHENTICATED',
    });
  });

  it('does not grant Membership or school authority in the output', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    const keys = Object.keys(await login(h.service)).sort();
    expect(keys).toEqual(
      ['absoluteExpiresAt', 'createdAt', 'idleExpiresAt', 'result', 'sessionId', 'userId'].sort(),
    );
  });
});

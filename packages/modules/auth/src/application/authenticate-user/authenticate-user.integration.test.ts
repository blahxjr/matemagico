import { describe, expect, it } from 'vitest';
import { InMemoryLoginAttemptLimiter } from '../../infrastructure/rate-limit/in-memory-login-attempt-limiter';
import { MAX_ACTIVE_SESSIONS } from '../../domain/policies/session-capacity';
import { AuthError } from '../errors/auth-error';
import { AuthenticateUserService } from './authenticate-user.service';
import { START, createHarness, login } from './test-support';

describe('AuthenticateUser integration (service + repositories + limiter)', () => {
  it('login válido cria Session válida, persistida e consultável pelo repositório', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    const output = await login(h.service);
    const stored = await h.sessions.findById(output.sessionId as never);

    expect(stored).not.toBeNull();
    expect(stored!.userId).toBe('user-1');
    expect(stored!.revokedAt).toBeNull();
    expect(stored!.isActiveAt(START)).toBe(true);
    expect(stored!.isActiveAt(new Date(START.getTime() + 29 * 60 * 1000))).toBe(true);
    expect(stored!.isActiveAt(new Date(START.getTime() + 30 * 60 * 1000))).toBe(false);
  });

  it('mantém no máximo cinco Sessions ativas: o sexto login revoga a mais antiga', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');

    const ids: string[] = [];
    for (let index = 0; index <= MAX_ACTIVE_SESSIONS; index++) {
      h.state.now = new Date(START.getTime() + index * 1000);
      ids.push((await login(h.service)).sessionId);
    }

    const active = await h.sessions.findActiveByUserId('user-1' as never, h.state.now);
    expect(active).toHaveLength(MAX_ACTIVE_SESSIONS);
    expect(active.map((s) => s.id)).not.toContain(ids[0]);
    expect(h.sessions.store.get(ids[0]!)!.revokedAt).not.toBeNull();
  });

  it('preserva a Session mais antiga se a criação da sexta falhar', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');
    for (let index = 0; index < MAX_ACTIVE_SESSIONS; index++) {
      h.state.now = new Date(START.getTime() + index * 1000);
      await login(h.service);
    }

    h.sessions.failCreate = true;
    h.state.now = new Date(START.getTime() + 10_000);
    await expect(login(h.service)).rejects.toMatchObject({ code: 'AUTH-004' });

    const active = await h.sessions.findActiveByUserId('user-1' as never, h.state.now);
    expect(active).toHaveLength(MAX_ACTIVE_SESSIONS);
    expect(h.sessions.store.get('session-1')!.revokedAt).toBeNull();
  });

  it('Users distintos têm limites e Sessions independentes', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');
    h.provision('bia@example.com', 'user-2');

    for (let attempt = 0; attempt < 5; attempt++) {
      await login(h.service, { password: 'wrong' }).catch(() => undefined);
    }
    await expect(login(h.service)).rejects.toMatchObject({ code: 'AUTH-002' });

    const bia = await login(h.service, { email: 'bia@example.com', clientIp: '10.0.0.9' });
    expect(bia.userId).toBe('user-2');
  });

  it('falha de dependência do limitador nega o login sem criar Session', async () => {
    const h = createHarness();
    h.provision('ana@example.com', 'user-1');
    const brokenLimiter = new InMemoryLoginAttemptLimiter();
    brokenLimiter.registerIpRequest = async () => {
      throw new Error('limiter down');
    };
    const service = new AuthenticateUserService({
      users: h.users,
      authAccounts: h.accounts,
      passwordCredentials: h.credentials,
      sessions: h.sessions,
      passwordVerifier: h.verifier,
      attemptLimiter: brokenLimiter,
      clock: { now: () => START },
      sessionIds: { next: () => 'x' },
    });

    const error = await login(service).catch((e) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe('AUTH-004');
    expect(h.sessions.store.size).toBe(0);
  });
});

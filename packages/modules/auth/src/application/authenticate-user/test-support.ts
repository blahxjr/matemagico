import { AuthAccount } from '../../domain/entities/auth-account';
import { PasswordCredential } from '../../domain/entities/password-credential';
import type { Session } from '../../domain/entities/session';
import { sessionsToRevokeForNewSession } from '../../domain/policies/session-capacity';
import type { AuthAccountRepository } from '../../domain/repositories/auth-account.repository';
import type { PasswordCredentialRepository } from '../../domain/repositories/password-credential.repository';
import type { SessionRepository } from '../../domain/repositories/session.repository';
import type { AuthAccountId, SessionId, UserId } from '../../domain/value-objects/identifiers';
import { InMemoryLoginAttemptLimiter } from '../../infrastructure/rate-limit/in-memory-login-attempt-limiter';
import type { PasswordVerifier } from '../ports/password-verifier';
import type { UserIdentity, UserRepository } from '../ports/user.repository';
import { AuthenticateUserService } from './authenticate-user.service';
import { GetSessionService } from '../get-session/get-session.service';
import { LogoutUserService } from '../logout-user/logout-user.service';
import { RevokeSessionService } from '../revoke-session/revoke-session.service';

export const CORRECT_PASSWORD = 'correct-horse';
export const START = new Date('2026-01-01T12:00:00.000Z');

export class FakeUsers implements UserRepository {
  readonly byEmail = new Map<string, { userId: string; status: string }>();
  failing = false;

  async findByNormalizedEmail(email: string): Promise<UserIdentity | null> {
    if (this.failing) throw new Error('users unavailable');
    const found = this.byEmail.get(email);
    return found ? { userId: found.userId as UserId, status: found.status } : null;
  }

  async findByUserId(userId: UserId): Promise<UserIdentity | null> {
    if (this.failing) throw new Error('users unavailable');
    const found = [...this.byEmail.values()].find((user) => user.userId === userId);
    return found ? { userId: found.userId as UserId, status: found.status } : null;
  }
}

export class InMemoryAuthAccounts implements AuthAccountRepository {
  readonly byUserId = new Map<string, AuthAccount>();
  async findByUserId(userId: UserId): Promise<AuthAccount | null> {
    return this.byUserId.get(userId) ?? null;
  }
}

export class InMemoryCredentials implements PasswordCredentialRepository {
  readonly byAccountId = new Map<string, PasswordCredential>();
  async findByAuthAccountId(id: AuthAccountId): Promise<PasswordCredential | null> {
    return this.byAccountId.get(id) ?? null;
  }
}

export class InMemorySessions implements SessionRepository {
  readonly store = new Map<string, Session>();
  failCreate = false;
  failFind = false;
  failRevoke = false;

  async findById(id: SessionId): Promise<Session | null> {
    if (this.failFind) throw new Error('session store unavailable');
    return this.store.get(id) ?? null;
  }

  async findActiveByUserId(userId: UserId, at: Date): Promise<readonly Session[]> {
    return [...this.store.values()].filter((s) => s.userId === userId && s.isActiveAt(at));
  }

  // Mirrors the Prisma adapter: evict and create as a single logical operation.
  async createWithinActiveLimit(session: Session): Promise<Session> {
    if (this.failCreate) throw new Error('storage failure');
    const active = await this.findActiveByUserId(session.userId, session.createdAt);
    const evicted = sessionsToRevokeForNewSession(
      active.map((s) => ({ sessionId: s.id, createdAt: s.createdAt })),
    );
    for (const { sessionId } of evicted) {
      this.store.set(sessionId, this.store.get(sessionId)!.revoke(session.createdAt, 'limit'));
    }
    this.store.set(session.id, session);
    return session;
  }

  async recordActivity(): Promise<Session> {
    throw new Error('out of scope');
  }

  // Mirrors the Prisma adapter: false when the Session is missing or already revoked.
  async revoke(id: SessionId, at: Date, reason?: string): Promise<boolean> {
    if (this.failRevoke) throw new Error('storage failure');
    const session = this.store.get(id);
    if (!session || session.revokedAt) return false;
    this.store.set(id, session.revoke(at, reason));
    return true;
  }
}

export class FakeVerifier implements PasswordVerifier {
  failing = false;
  async verify(plain: string): Promise<boolean> {
    if (this.failing) throw new Error('verifier unavailable');
    return plain === CORRECT_PASSWORD;
  }
}

export function createHarness() {
  const users = new FakeUsers();
  const accounts = new InMemoryAuthAccounts();
  const credentials = new InMemoryCredentials();
  const sessions = new InMemorySessions();
  const verifier = new FakeVerifier();
  const limiter = new InMemoryLoginAttemptLimiter();
  const state = { now: START, counter: 0 };

  const service = new AuthenticateUserService({
    users,
    authAccounts: accounts,
    passwordCredentials: credentials,
    sessions,
    passwordVerifier: verifier,
    attemptLimiter: limiter,
    clock: { now: () => state.now },
    sessionIds: { next: () => `session-${++state.counter}` },
  });

  const clock = { now: () => state.now };
  const getSession = new GetSessionService({ sessions, users, clock });
  const revokeSession = new RevokeSessionService({ sessions, getSession, clock });
  const logout = new LogoutUserService(revokeSession);

  function provision(email: string, userId: string, status = 'ACTIVE') {
    users.byEmail.set(email, { userId, status });
    const account = AuthAccount.create({
      authAccountId: `account-${userId}`,
      userId,
      provider: 'credentials',
      subject: email,
    });
    accounts.byUserId.set(userId, account);
    credentials.byAccountId.set(
      account.id,
      PasswordCredential.create({
        passwordCredentialId: `credential-${userId}`,
        authAccountId: account.id,
        encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$c2FsdA$aGFzaA',
        hashParameters: { memoryCost: 65536, timeCost: 3, parallelism: 1 },
        passwordChangedAt: START,
      }),
    );
  }

  return {
    service,
    getSession,
    revokeSession,
    logout,
    users,
    accounts,
    credentials,
    sessions,
    verifier,
    limiter,
    state,
    provision,
  };
}

export const login = (
  service: AuthenticateUserService,
  overrides: Partial<{ email: string; password: string; clientIp: string }> = {},
) =>
  service.execute({
    email: 'ana@example.com',
    password: CORRECT_PASSWORD,
    clientIp: '10.0.0.1',
    ...overrides,
  });

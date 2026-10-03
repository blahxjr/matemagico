import { AuthDomainError } from '../../domain/errors/auth-domain-error';
import { Session } from '../../domain/entities/session';
import type { AuthAccountRepository } from '../../domain/repositories/auth-account.repository';
import type { PasswordCredentialRepository } from '../../domain/repositories/password-credential.repository';
import type { SessionRepository } from '../../domain/repositories/session.repository';
import { AuthError } from '../errors/auth-error';
import type { LoginAttemptLimiter } from '../ports/login-attempt-limiter';
import type { PasswordVerifier } from '../ports/password-verifier';
import type { Clock, SessionIdGenerator } from '../ports/runtime';
import { ELIGIBLE_USER_STATUS, type UserRepository } from '../ports/user.repository';

export type AuthenticateUserInput = Readonly<{
  email: string;
  password: string;
  clientIp: string;
}>;

export type AuthenticateUserOutput = Readonly<{
  result: 'AUTHENTICATED';
  userId: string;
  sessionId: string;
  createdAt: Date;
  absoluteExpiresAt: Date;
  idleExpiresAt: Date;
}>;

export type AuthenticateUserDependencies = Readonly<{
  users: UserRepository;
  authAccounts: AuthAccountRepository;
  passwordCredentials: PasswordCredentialRepository;
  sessions: SessionRepository;
  passwordVerifier: PasswordVerifier;
  attemptLimiter: LoginAttemptLimiter;
  clock: Clock;
  sessionIds: SessionIdGenerator;
}>;

export class AuthenticateUserService {
  constructor(private readonly deps: AuthenticateUserDependencies) {}

  async execute(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    const { email, password, clientIp } = validateInput(input);
    const now = this.deps.clock.now();

    await this.enforceAttemptLimits(email, clientIp, now);

    const user = await this.guard(() => this.deps.users.findByNormalizedEmail(email));
    if (!user || user.status !== ELIGIBLE_USER_STATUS) {
      return this.denyCredentials(email, now);
    }

    const account = await this.guardStructure(() =>
      this.deps.authAccounts.findByUserId(user.userId),
    );
    if (!account || account.userId !== user.userId) {
      return this.denyCredentials(email, now);
    }

    const credential = await this.guardStructure(() =>
      this.deps.passwordCredentials.findByAuthAccountId(account.id),
    );
    if (!credential || credential.authAccountId !== account.id) {
      return this.denyCredentials(email, now);
    }

    const passwordMatches = await this.guard(() =>
      this.deps.passwordVerifier.verify(password, credential.verificationMaterial()),
    );
    if (!passwordMatches) {
      return this.denyCredentials(email, now);
    }

    const session = await this.guard(() =>
      this.deps.sessions.createWithinActiveLimit(
        Session.create(this.deps.sessionIds.next(), user.userId, now),
      ),
    );

    return {
      result: 'AUTHENTICATED',
      userId: session.userId,
      sessionId: session.id,
      createdAt: session.createdAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
      idleExpiresAt: session.idleExpiresAt,
    };
  }

  private async enforceAttemptLimits(email: string, ip: string, now: Date): Promise<void> {
    const [ipAllowed, emailBlocked] = await this.guard(async () => {
      const allowed = await this.deps.attemptLimiter.registerIpRequest(ip, now);
      const blocked = await this.deps.attemptLimiter.isEmailBlocked(email, now);
      return [allowed, blocked] as const;
    });

    if (!ipAllowed || emailBlocked) {
      throw new AuthError('AUTH-002');
    }
  }

  private async denyCredentials(email: string, now: Date): Promise<never> {
    await this.guard(() => this.deps.attemptLimiter.recordEmailFailure(email, now));
    throw new AuthError('AUTH-001');
  }

  // Any unavailable dependency denies the operation (fail closed).
  private async guard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new AuthError('AUTH-004');
    }
  }

  // Malformed persisted account/credential structure is an AUTH-001 denial.
  private async guardStructure<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw error instanceof AuthDomainError
        ? new AuthError('AUTH-001')
        : new AuthError('AUTH-004');
    }
  }
}

function validateInput(input: AuthenticateUserInput): AuthenticateUserInput {
  const { email, password, clientIp } = input ?? ({} as Partial<AuthenticateUserInput>);
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof clientIp !== 'string' ||
    !password ||
    !clientIp.trim()
  ) {
    throw new AuthError('AUTH-005');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (
    !normalizedEmail.includes('@') ||
    normalizedEmail.startsWith('@') ||
    normalizedEmail.endsWith('@')
  ) {
    throw new AuthError('AUTH-005');
  }

  return { email: normalizedEmail, password, clientIp: clientIp.trim() };
}

import { AuthDomainError } from '../errors/auth-domain-error';
import { sessionId, type SessionId, type UserId, userId } from '../value-objects/identifiers';

export const ABSOLUTE_SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
export const IDLE_SESSION_LIFETIME_MS = 30 * 60 * 1000;

export type SessionInput = Readonly<{
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  absoluteExpiresAt: Date;
  idleExpiresAt: Date;
  revokedAt?: Date | null;
  revocationReason?: string | null;
}>;

export class Session {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly #createdAt: Date;
  readonly #lastSeenAt: Date;
  readonly #absoluteExpiresAt: Date;
  readonly #idleExpiresAt: Date;
  readonly #revokedAt: Date | null;
  readonly revocationReason: string | null;

  private constructor(input: SessionInput) {
    this.id = sessionId(input.sessionId);
    this.userId = userId(input.userId);
    this.#createdAt = validDate(input.createdAt, 'createdAt');
    this.#lastSeenAt = validDate(input.lastSeenAt, 'lastSeenAt');
    this.#absoluteExpiresAt = validDate(input.absoluteExpiresAt, 'absoluteExpiresAt');
    this.#idleExpiresAt = validDate(input.idleExpiresAt, 'idleExpiresAt');
    this.#revokedAt =
      input.revokedAt === undefined || input.revokedAt === null
        ? null
        : validDate(input.revokedAt, 'revokedAt');
    this.revocationReason = input.revocationReason ?? null;
    this.validateTimestamps();
  }

  static create(sessionIdValue: string, userIdValue: string, createdAt: Date): Session {
    const created = validDate(createdAt, 'createdAt');
    return new Session({
      sessionId: sessionIdValue,
      userId: userIdValue,
      createdAt: created,
      lastSeenAt: created,
      absoluteExpiresAt: new Date(created.getTime() + ABSOLUTE_SESSION_LIFETIME_MS),
      idleExpiresAt: new Date(
        Math.min(
          created.getTime() + IDLE_SESSION_LIFETIME_MS,
          created.getTime() + ABSOLUTE_SESSION_LIFETIME_MS,
        ),
      ),
    });
  }

  static rehydrate(input: SessionInput): Session {
    return new Session(input);
  }

  get createdAt(): Date {
    return new Date(this.#createdAt);
  }

  get lastSeenAt(): Date {
    return new Date(this.#lastSeenAt);
  }

  get absoluteExpiresAt(): Date {
    return new Date(this.#absoluteExpiresAt);
  }

  get idleExpiresAt(): Date {
    return new Date(this.#idleExpiresAt);
  }

  get revokedAt(): Date | null {
    return this.#revokedAt ? new Date(this.#revokedAt) : null;
  }

  isActiveAt(now: Date): boolean {
    const instant = validDate(now, 'now').getTime();
    return (
      this.#revokedAt === null &&
      instant < this.#absoluteExpiresAt.getTime() &&
      instant < this.#idleExpiresAt.getTime()
    );
  }

  recordActivity(now: Date): Session {
    const instant = validDate(now, 'now');
    if (!this.isActiveAt(instant)) {
      throw new AuthDomainError('Cannot record activity for an inactive Session.');
    }
    if (instant.getTime() < this.#lastSeenAt.getTime()) {
      throw new AuthDomainError('Session activity cannot move backwards in time.');
    }

    return Session.rehydrate({
      sessionId: this.id,
      userId: this.userId,
      createdAt: this.#createdAt,
      lastSeenAt: instant,
      absoluteExpiresAt: this.#absoluteExpiresAt,
      idleExpiresAt: new Date(
        Math.min(instant.getTime() + IDLE_SESSION_LIFETIME_MS, this.#absoluteExpiresAt.getTime()),
      ),
      revokedAt: this.#revokedAt,
      revocationReason: this.revocationReason,
    });
  }

  revoke(at: Date, reason?: string): Session {
    if (this.#revokedAt) {
      throw new AuthDomainError('Session is already revoked.');
    }

    return Session.rehydrate({
      sessionId: this.id,
      userId: this.userId,
      createdAt: this.#createdAt,
      lastSeenAt: this.#lastSeenAt,
      absoluteExpiresAt: this.#absoluteExpiresAt,
      idleExpiresAt: this.#idleExpiresAt,
      revokedAt: validDate(at, 'revokedAt'),
      revocationReason: reason ?? null,
    });
  }

  private validateTimestamps(): void {
    const created = this.#createdAt.getTime();
    const lastSeen = this.#lastSeenAt.getTime();
    const absolute = this.#absoluteExpiresAt.getTime();
    const idle = this.#idleExpiresAt.getTime();

    if (absolute !== created + ABSOLUTE_SESSION_LIFETIME_MS) {
      throw new AuthDomainError('absoluteExpiresAt must be eight hours after createdAt.');
    }
    if (lastSeen < created || lastSeen > absolute) {
      throw new AuthDomainError('lastSeenAt must be between createdAt and absoluteExpiresAt.');
    }
    if (idle !== Math.min(lastSeen + IDLE_SESSION_LIFETIME_MS, absolute)) {
      throw new AuthDomainError('idleExpiresAt must match the current idle window.');
    }
    if (this.#revokedAt && this.#revokedAt.getTime() < Math.max(created, lastSeen)) {
      throw new AuthDomainError('revokedAt cannot precede Session creation or last activity.');
    }
    if (this.#revokedAt === null && this.revocationReason !== null) {
      throw new AuthDomainError('An unrevoked Session cannot have a revocation reason.');
    }
  }
}

function validDate(value: Date, name: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new AuthDomainError(`${name} must be a valid date.`);
  }

  return new Date(value);
}

import type { SessionRepository } from '../../domain/repositories/session.repository';
import { sessionId } from '../../domain/value-objects/identifiers';
import { AuthError } from '../errors/auth-error';
import type { Clock } from '../ports/runtime';
import { ELIGIBLE_USER_STATUS, type UserRepository } from '../ports/user.repository';

export type GetSessionInput = Readonly<{ sessionId: string }>;

export type GetSessionOutput = Readonly<{
  state: 'VALID';
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  absoluteExpiresAt: Date;
  idleExpiresAt: Date;
}>;

export type GetSessionDependencies = Readonly<{
  sessions: SessionRepository;
  users: UserRepository;
  clock: Clock;
}>;

export class GetSessionService {
  constructor(private readonly deps: GetSessionDependencies) {}

  async execute(input: GetSessionInput): Promise<GetSessionOutput> {
    const reference = input?.sessionId;
    if (typeof reference !== 'string' || !reference.trim()) {
      throw new AuthError('AUTH-005');
    }

    const id = sessionId(reference);
    const session = await this.guard(() => this.deps.sessions.findById(id));
    const now = this.deps.clock.now();
    if (!session || !session.isActiveAt(now)) {
      throw new AuthError('AUTH-003');
    }

    const user = await this.guard(() => this.deps.users.findByUserId(session.userId));
    if (!user || user.status !== ELIGIBLE_USER_STATUS) {
      throw new AuthError('AUTH-003');
    }

    return {
      state: 'VALID',
      sessionId: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
      idleExpiresAt: session.idleExpiresAt,
    };
  }

  // Unavailable verification denies the operation (fail closed).
  private async guard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new AuthError('AUTH-004');
    }
  }
}

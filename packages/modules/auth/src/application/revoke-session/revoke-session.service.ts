import type { SessionRepository } from '../../domain/repositories/session.repository';
import { sessionId } from '../../domain/value-objects/identifiers';
import { AuthError } from '../errors/auth-error';
import type { GetSessionService } from '../get-session/get-session.service';
import type { Clock } from '../ports/runtime';

export type RevocationReason = 'LOGOUT' | 'REVOKE_SESSION';

export type RevokeSessionInput = Readonly<{
  /** Session requested for revocation. */
  sessionId: string;
  /** Session of the authenticated call context; the only one that may be revoked. */
  currentSessionId: string;
  reason?: RevocationReason;
}>;

export type RevokeSessionOutput = Readonly<{
  result: 'REVOKED';
  sessionId: string;
  revokedAt: Date;
}>;

export type RevokeSessionDependencies = Readonly<{
  sessions: SessionRepository;
  getSession: Pick<GetSessionService, 'execute'>;
  clock: Clock;
}>;

export class RevokeSessionService {
  constructor(private readonly deps: RevokeSessionDependencies) {}

  async execute(input: RevokeSessionInput): Promise<RevokeSessionOutput> {
    const requested = input?.sessionId;
    if (typeof requested !== 'string' || !requested.trim()) {
      throw new AuthError('AUTH-005');
    }

    const current = input.currentSessionId;
    if (typeof current !== 'string' || current !== requested) {
      throw new AuthError('AUTH-003');
    }

    // Unknown, expired, inactive or already revoked Sessions are rejected here as AUTH-003.
    const validated = await this.deps.getSession.execute({ sessionId: requested });

    const revokedAt = this.deps.clock.now();
    let revoked: boolean;
    try {
      revoked = await this.deps.sessions.revoke(
        sessionId(validated.sessionId),
        revokedAt,
        input.reason ?? 'REVOKE_SESSION',
      );
    } catch {
      throw new AuthError('AUTH-004');
    }

    // Lost a race with another revocation: never confirm a revocation this call did not perform.
    if (!revoked) {
      throw new AuthError('AUTH-003');
    }

    return { result: 'REVOKED', sessionId: validated.sessionId, revokedAt };
  }
}

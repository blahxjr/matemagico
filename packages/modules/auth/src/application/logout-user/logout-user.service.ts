import { AuthError } from '../errors/auth-error';
import type { RevokeSessionService } from '../revoke-session/revoke-session.service';

export type LogoutUserInput = Readonly<{
  /** Session of the authenticated call context. Logout accepts no other target. */
  currentSessionId: string;
}>;

export type LogoutUserOutput = Readonly<{
  result: 'REVOKED';
  sessionId: string;
  revokedAt: Date;
}>;

export class LogoutUserService {
  constructor(private readonly revokeSession: Pick<RevokeSessionService, 'execute'>) {}

  async execute(input: LogoutUserInput): Promise<LogoutUserOutput> {
    const current = input?.currentSessionId;
    if (typeof current !== 'string' || !current.trim()) {
      throw new AuthError('AUTH-003');
    }

    const { result, sessionId, revokedAt } = await this.revokeSession.execute({
      sessionId: current,
      currentSessionId: current,
      reason: 'LOGOUT',
    });

    return { result, sessionId, revokedAt };
  }
}

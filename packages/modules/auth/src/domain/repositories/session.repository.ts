import type { Session } from '../entities/session';
import { MAX_ACTIVE_SESSIONS } from '../policies/session-capacity';
import type { SessionId, UserId } from '../value-objects/identifiers';

export { MAX_ACTIVE_SESSIONS };

export interface SessionRepository {
  findById(sessionId: SessionId): Promise<Session | null>;
  createWithinActiveLimit(session: Session): Promise<Session>;
  recordActivity(sessionId: SessionId, at: Date): Promise<Session>;
  revoke(sessionId: SessionId, at: Date, reason?: string): Promise<boolean>;
  findActiveByUserId(userId: UserId, at: Date): Promise<readonly Session[]>;
}

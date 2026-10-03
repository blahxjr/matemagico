import type { SessionId } from '../value-objects/identifiers';

export const MAX_ACTIVE_SESSIONS = 5;

export type ActiveSessionReference = Readonly<{
  sessionId: SessionId;
  createdAt: Date;
}>;

export function sessionsToRevokeForNewSession(
  activeSessions: readonly ActiveSessionReference[],
): readonly ActiveSessionReference[] {
  const ordered = [...activeSessions].sort((left, right) => {
    const byCreationTime = left.createdAt.getTime() - right.createdAt.getTime();
    if (byCreationTime !== 0) {
      return byCreationTime;
    }
    return left.sessionId < right.sessionId ? -1 : left.sessionId > right.sessionId ? 1 : 0;
  });

  const countToRevoke = Math.max(0, ordered.length - MAX_ACTIVE_SESSIONS + 1);
  return ordered.slice(0, countToRevoke);
}

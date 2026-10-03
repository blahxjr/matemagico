import { describe, expect, it } from 'vitest';
import { MAX_ACTIVE_SESSIONS, sessionsToRevokeForNewSession } from './session-capacity';
import { sessionId } from '../value-objects/identifiers';

const activeSessions = (ids: string[], createdAt: Date = new Date(0)) =>
  ids.map((id) => ({ sessionId: sessionId(id), createdAt }));

describe('sessionsToRevokeForNewSession', () => {
  it('does not evict below the five-session limit', () => {
    expect(sessionsToRevokeForNewSession(activeSessions(['a', 'b']))).toEqual([]);
    expect(MAX_ACTIVE_SESSIONS).toBe(5);
  });

  it('evicts the oldest session and uses lexical id to break timestamp ties', () => {
    const sessions = [
      ...activeSessions(['session-z', 'session-a']),
      { sessionId: sessionId('older'), createdAt: new Date(-1) },
      ...activeSessions(['session-b', 'session-c']),
    ];

    expect(sessionsToRevokeForNewSession(sessions).map(({ sessionId: id }) => id)).toEqual([
      'older',
    ]);

    const tied = activeSessions(['session-z', 'session-a', 'session-b', 'session-c', 'session-d']);
    expect(sessionsToRevokeForNewSession(tied).map(({ sessionId: id }) => id)).toEqual([
      'session-a',
    ]);
  });

  it('evicts enough sessions to leave room when prior state exceeds the limit', () => {
    expect(
      sessionsToRevokeForNewSession(activeSessions(['a', 'b', 'c', 'd', 'e', 'f', 'g'])),
    ).toHaveLength(3);
  });
});

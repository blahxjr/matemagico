import { describe, expect, it } from 'vitest';
import { ABSOLUTE_SESSION_LIFETIME_MS, IDLE_SESSION_LIFETIME_MS, Session } from './session';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

describe('Session', () => {
  it('sets the eight-hour absolute limit and initial 30-minute idle limit', () => {
    const session = Session.create('session-1', 'user-1', createdAt);

    expect(session.absoluteExpiresAt.getTime() - createdAt.getTime()).toBe(
      ABSOLUTE_SESSION_LIFETIME_MS,
    );
    expect(session.idleExpiresAt.getTime() - createdAt.getTime()).toBe(IDLE_SESSION_LIFETIME_MS);
  });

  it('expires at either deadline and caps activity at absolute expiration', () => {
    const session = Session.create('session-1', 'user-1', createdAt);
    const afterIdleWindow = new Date(createdAt.getTime() + IDLE_SESSION_LIFETIME_MS);
    expect(session.isActiveAt(afterIdleWindow)).toBe(false);

    const lastSeenAt = new Date(createdAt.getTime() + ABSOLUTE_SESSION_LIFETIME_MS - 5 * 60 * 1000);
    const nearAbsoluteExpiry = Session.rehydrate({
      sessionId: 'session-1',
      userId: 'user-1',
      createdAt,
      lastSeenAt,
      absoluteExpiresAt: new Date(createdAt.getTime() + ABSOLUTE_SESSION_LIFETIME_MS),
      idleExpiresAt: new Date(createdAt.getTime() + ABSOLUTE_SESSION_LIFETIME_MS),
    }).recordActivity(lastSeenAt);
    expect(nearAbsoluteExpiry.idleExpiresAt).toEqual(nearAbsoluteExpiry.absoluteExpiresAt);
    expect(nearAbsoluteExpiry.isActiveAt(nearAbsoluteExpiry.absoluteExpiresAt)).toBe(false);
  });

  it('rejects inconsistent persisted deadlines and activity after revocation', () => {
    const session = Session.create('session-1', 'user-1', createdAt);
    expect(() =>
      Session.rehydrate({
        sessionId: 'session-1',
        userId: 'user-1',
        createdAt,
        lastSeenAt: createdAt,
        absoluteExpiresAt: new Date(createdAt.getTime() + 1),
        idleExpiresAt: new Date(createdAt.getTime() + IDLE_SESSION_LIFETIME_MS),
      }),
    ).toThrow('absoluteExpiresAt must be eight hours');

    const revoked = session.revoke(new Date(createdAt.getTime() + 1000), 'rotation');
    expect(revoked.isActiveAt(new Date(createdAt.getTime() + 2000))).toBe(false);
    expect(() => revoked.recordActivity(new Date(createdAt.getTime() + 2000))).toThrow(
      'inactive Session',
    );
  });

  it('returns defensive copies of timestamps', () => {
    const session = Session.create('session-1', 'user-1', createdAt);
    const returnedDate = session.createdAt;
    returnedDate.setUTCFullYear(2030);

    expect(session.createdAt.getUTCFullYear()).toBe(2026);
  });
});

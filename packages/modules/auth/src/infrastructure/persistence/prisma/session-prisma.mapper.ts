import type { Session as PrismaSession } from '@prisma/client';
import { Session } from '../../../domain/entities/session';

export function toDomainSession(record: PrismaSession): Session {
  return Session.rehydrate({
    sessionId: record.sessionId,
    userId: record.userId,
    createdAt: record.createdAt,
    lastSeenAt: record.lastSeenAt,
    absoluteExpiresAt: record.absoluteExpiresAt,
    idleExpiresAt: record.idleExpiresAt,
    revokedAt: record.revokedAt,
    revocationReason: record.revocationReason,
  });
}

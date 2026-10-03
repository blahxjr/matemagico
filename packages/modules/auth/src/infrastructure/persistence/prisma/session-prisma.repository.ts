import { Prisma, PrismaClient } from '@prisma/client';
import { Session } from '../../../domain/entities/session';
import { sessionsToRevokeForNewSession } from '../../../domain/policies/session-capacity';
import type { SessionRepository } from '../../../domain/repositories/session.repository';
import {
  sessionId,
  type SessionId,
  type UserId,
  userId,
} from '../../../domain/value-objects/identifiers';
import { toDomainSession } from './session-prisma.mapper';

export class SessionPrismaRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(sessionIdValue: SessionId): Promise<Session | null> {
    const record = await this.prisma.session.findUnique({
      where: { sessionId: sessionIdValue },
    });
    return record ? toDomainSession(record) : null;
  }

  async findActiveByUserId(userIdValue: UserId, at: Date): Promise<readonly Session[]> {
    const records = await this.prisma.session.findMany({
      where: {
        userId: userIdValue,
        revokedAt: null,
        absoluteExpiresAt: { gt: at },
        idleExpiresAt: { gt: at },
      },
      orderBy: [{ createdAt: 'asc' }, { sessionId: 'asc' }],
    });
    return records.map(toDomainSession);
  }

  async createWithinActiveLimit(session: Session): Promise<Session> {
    return this.prisma.$transaction(
      async (transaction) => {
        const activeRecords = await transaction.session.findMany({
          where: {
            userId: session.userId,
            revokedAt: null,
            absoluteExpiresAt: { gt: session.createdAt },
            idleExpiresAt: { gt: session.createdAt },
          },
          select: { sessionId: true, createdAt: true },
        });

        const oldestSessions = sessionsToRevokeForNewSession(
          activeRecords.map((record) => ({
            sessionId: sessionId(record.sessionId),
            createdAt: record.createdAt,
          })),
        );

        for (const oldest of oldestSessions) {
          const update = await transaction.session.updateMany({
            where: { sessionId: oldest.sessionId, revokedAt: null },
            data: { revokedAt: session.createdAt },
          });
          if (update.count !== 1) {
            throw new Error(`Concurrent Session change detected for ${oldest.sessionId}.`);
          }
        }

        const created = await transaction.session.create({
          data: {
            sessionId: session.id,
            userId: session.userId,
            createdAt: session.createdAt,
            lastSeenAt: session.lastSeenAt,
            absoluteExpiresAt: session.absoluteExpiresAt,
            idleExpiresAt: session.idleExpiresAt,
          },
        });

        return toDomainSession(created);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async recordActivity(sessionIdValue: SessionId, at: Date): Promise<Session> {
    return this.prisma.$transaction(async (transaction) => {
      const record = await transaction.session.findUnique({
        where: { sessionId: sessionIdValue },
      });
      if (!record) {
        throw new Error(`Session not found: ${sessionIdValue}.`);
      }

      const updated = toDomainSession(record).recordActivity(at);
      const result = await transaction.session.updateMany({
        where: {
          sessionId: sessionIdValue,
          revokedAt: null,
          lastSeenAt: { lte: at },
          absoluteExpiresAt: { gt: at },
          idleExpiresAt: { gt: at },
        },
        data: {
          lastSeenAt: updated.lastSeenAt,
          idleExpiresAt: updated.idleExpiresAt,
        },
      });
      if (result.count !== 1) {
        throw new Error(`Session is no longer active: ${sessionIdValue}.`);
      }

      const updatedRecord = await transaction.session.findUnique({
        where: { sessionId: sessionIdValue },
      });
      if (!updatedRecord) {
        throw new Error(`Session disappeared after activity update: ${sessionIdValue}.`);
      }

      return toDomainSession(updatedRecord);
    });
  }

  async revoke(sessionIdValue: SessionId, at: Date, reason?: string): Promise<boolean> {
    const record = await this.prisma.session.findUnique({
      where: { sessionId: sessionIdValue },
    });
    if (!record || record.revokedAt) {
      return false;
    }

    const revoked = toDomainSession(record).revoke(at, reason);
    const result = await this.prisma.session.updateMany({
      where: {
        sessionId: sessionIdValue,
        revokedAt: null,
        lastSeenAt: { lte: at },
      },
      data: {
        revokedAt: revoked.revokedAt,
        revocationReason: revoked.revocationReason,
      },
    });
    if (result.count === 1) {
      return true;
    }

    const current = await this.prisma.session.findUnique({
      where: { sessionId: sessionIdValue },
      select: { revokedAt: true },
    });
    if (!current || current.revokedAt) {
      return false;
    }

    throw new Error(`Concurrent Session change detected for ${sessionIdValue}.`);
  }
}

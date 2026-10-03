import { Prisma, PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { Session } from '../../../domain/entities/session';
import { sessionId } from '../../../domain/value-objects/identifiers';
import { SessionPrismaRepository } from './session-prisma.repository';

describe('SessionPrismaRepository', () => {
  it('evicts the oldest active session and creates the replacement in one serializable transaction', async () => {
    const createdAt = new Date('2026-01-01T12:00:00.000Z');
    const oldSessionIds = ['session-d', 'session-b', 'session-c', 'session-a', 'session-e'];
    const activeRecords = oldSessionIds.map((id, index) => ({
      sessionId: id,
      createdAt: new Date(createdAt.getTime() - (oldSessionIds.length - index) * 1000),
    }));
    const steps: string[] = [];
    const transactionSession = {
      findMany: vi.fn().mockResolvedValue(activeRecords),
      updateMany: vi.fn().mockImplementation(async ({ where }) => {
        steps.push(`revoke:${where.sessionId}`);
        return { count: 1 };
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        steps.push(`create:${data.sessionId}`);
        return {
          ...data,
          revokedAt: null,
          revocationReason: null,
        };
      }),
    };
    const transaction = {
      session: transactionSession,
    } as unknown as Prisma.TransactionClient;
    const prisma = {
      $transaction: vi.fn(async <T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) =>
        operation(transaction),
      ),
    } as unknown as PrismaClient;

    const createdSession = Session.create('session-new', 'user-1', createdAt);
    const result = await new SessionPrismaRepository(prisma).createWithinActiveLimit(
      createdSession,
    );

    expect(steps).toEqual(['revoke:session-d', 'create:session-new']);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(result.id).toBe(sessionId('session-new'));
  });

  it('propagates creation errors from the transaction', async () => {
    const transactionSession = {
      findMany: vi.fn().mockResolvedValue([
        { sessionId: 'oldest', createdAt: new Date('2026-01-01T00:00:00.000Z') },
        { sessionId: 'active-2', createdAt: new Date('2026-01-01T00:00:01.000Z') },
        { sessionId: 'active-3', createdAt: new Date('2026-01-01T00:00:02.000Z') },
        { sessionId: 'active-4', createdAt: new Date('2026-01-01T00:00:03.000Z') },
        { sessionId: 'active-5', createdAt: new Date('2026-01-01T00:00:04.000Z') },
      ]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockRejectedValue(new Error('storage failure')),
    };
    const transaction = {
      session: transactionSession,
    } as unknown as Prisma.TransactionClient;
    const prisma = {
      $transaction: vi.fn(async <T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) =>
        operation(transaction),
      ),
    } as unknown as PrismaClient;

    await expect(
      new SessionPrismaRepository(prisma).createWithinActiveLimit(
        Session.create('session-new', 'user-1', new Date('2026-01-01T12:00:00.000Z')),
      ),
    ).rejects.toThrow('storage failure');
  });

  it('persists revocation only when the Session has not already been revoked', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const session = Session.create('session-1', 'user-1', createdAt);
    const sessionRecord = {
      sessionId: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
      idleExpiresAt: session.idleExpiresAt,
      revokedAt: null,
      revocationReason: null,
    };
    const findUnique = vi.fn().mockResolvedValue(sessionRecord);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      session: { findUnique, updateMany },
    } as unknown as PrismaClient;
    const revokedAt = new Date(createdAt.getTime() + 1000);

    await expect(
      new SessionPrismaRepository(prisma).revoke(session.id, revokedAt, 'logout'),
    ).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        sessionId: session.id,
        revokedAt: null,
        lastSeenAt: { lte: revokedAt },
      },
      data: { revokedAt, revocationReason: 'logout' },
    });
  });
});

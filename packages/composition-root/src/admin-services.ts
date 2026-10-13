import type { PrismaClient } from '@prisma/client';
import { assertEventContract } from '@matemagico/events';
import type { RankingProjectionHandler } from '@matemagico/rankings';

export interface SchoolMemberView {
  readonly membershipId: string;
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly state: string;
  readonly roles: readonly string[];
}

/** Read model for school administration: memberships of one school with the user and active roles. */
export class ListSchoolMembersService {
  constructor(private readonly deps: { prisma: PrismaClient; clock: { now(): Date } }) {}

  async execute(input: { schoolId: string }): Promise<{ items: SchoolMemberView[] }> {
    const now = this.deps.clock.now();
    const memberships = await this.deps.prisma.schoolMembership.findMany({
      where: { schoolId: input.schoolId },
      include: {
        grants: {
          where: {
            revokedAt: null,
            validFrom: { lte: now },
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const users = await this.deps.prisma.user.findMany({
      where: { userId: { in: memberships.map((m) => m.userId) } },
    });
    const byId = new Map(users.map((user) => [user.userId, user]));
    return {
      items: memberships.map((membership) => ({
        membershipId: membership.membershipId,
        userId: membership.userId,
        name: byId.get(membership.userId)?.name ?? '',
        email: byId.get(membership.userId)?.email ?? '',
        state: membership.state,
        roles: [...new Set(membership.grants.map((grant) => grant.roleId))].sort(),
      })),
    };
  }
}

/**
 * Outbox dispatcher for AttemptCompleted: delivers SUBMITTED attempts that carry the event and
 * have no RankingEntry yet. At-least-once and idempotent (the projection upserts by attempt).
 */
export class AttemptCompletedDispatcher {
  constructor(
    private readonly deps: {
      prisma: PrismaClient;
      handler: Pick<RankingProjectionHandler, 'handle'>;
    },
  ) {}

  async dispatchPending(limit = 100): Promise<number> {
    const pending = await this.deps.prisma.$queryRaw<
      {
        attemptId: string;
        examId: string;
        userId: string;
        schoolId: string;
        completedEvent: unknown;
        correctAnswers: number | null;
        startedAt: Date;
        submittedAt: Date;
      }[]
    >`SELECT a."attemptId", a."examId", a."userId", a."schoolId", a."completedEvent",
             a."correctAnswers",
             a."startedAt", a."submittedAt"
      FROM "Attempt" a
      WHERE a."completedEvent" IS NOT NULL AND a."status" = 'SUBMITTED' AND a."submittedAt" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "RankingEntry" r WHERE r."attemptId" = a."attemptId")
      ORDER BY a."submittedAt" ASC
      LIMIT ${limit}`;
    for (const row of pending) {
      assertEventContract(row.completedEvent);
      const event = row.completedEvent;
      if (
        event.eventName !== 'AttemptCompleted' ||
        event.aggregateId !== row.attemptId ||
        event.payload.attemptId !== row.attemptId ||
        event.payload.examId !== row.examId ||
        event.payload.userId !== row.userId ||
        event.payload.schoolId !== row.schoolId
      ) {
        throw new Error('AttemptCompleted outbox event does not match its attempt.');
      }
      const correctAnswers = event.payload.correctAnswers ?? row.correctAnswers;
      if (correctAnswers === null) {
        throw new Error('AttemptCompleted outbox event has no correct-answer count.');
      }
      await this.deps.handler.handle({
        attemptId: event.payload.attemptId,
        examId: event.payload.examId,
        userId: event.payload.userId,
        schoolId: event.payload.schoolId,
        score: event.payload.score,
        correctAnswers,
        timeSpentSeconds:
          event.payload.timeSpentSeconds ??
          Math.max(0, Math.round((row.submittedAt.getTime() - row.startedAt.getTime()) / 1000)),
        completedAt: new Date(event.occurredAt),
        status: 'COMPLETED',
      });
    }
    return pending.length;
  }
}

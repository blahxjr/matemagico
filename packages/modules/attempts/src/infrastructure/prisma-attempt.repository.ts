import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { assertEventContract } from '@matemagico/events';
import type { AttemptCompletedEvent } from '@matemagico/events';
import { Attempt, AttemptsError, type AttemptSnapshotState } from '../domain/attempt';
import type { AttemptRepository } from '../domain/ports';

type Row = Prisma.AttemptGetPayload<{ include: { answers: true } }>;

const asNumber = (value: Prisma.Decimal | null) => (value === null ? null : Number(value));
const readRecord = (value: Prisma.JsonValue | null) => value as Record<string, unknown> | null;

function toState(row: Row): AttemptSnapshotState {
  const result = readRecord(row.result) as AttemptSnapshotState['result'];
  return {
    attemptId: row.attemptId,
    schoolId: row.schoolId,
    userId: row.userId,
    status: row.status,
    snapshot: row.examSnapshot as unknown as AttemptSnapshotState['snapshot'],
    startedAt: row.startedAt,
    expiresAt: row.expiresAt,
    submittedAt: row.submittedAt,
    answers: row.answers.map((answer) => ({
      questionId: answer.questionId,
      questionVersion: answer.questionVersion,
      selectedOption: answer.selectedOption,
      isCorrect: answer.isCorrect,
      answeredAt: answer.answeredAt,
    })),
    result: result
      ? {
          ...result,
          score: asNumber(row.score) ?? 0,
          correctAnswers: row.correctAnswers ?? 0,
          wrongAnswers: result.wrongAnswers ?? row.totalQuestions - (row.correctAnswers ?? 0),
          totalQuestions: row.totalQuestions,
          percentage: asNumber(row.percentage) ?? 0,
          topicResults: (readRecord(row.topicResults) ?? result.topicResults ?? {}) as NonNullable<
            AttemptSnapshotState['result']
          >['topicResults'],
          difficultyResults: (result.difficultyResults ?? {}) as NonNullable<
            AttemptSnapshotState['result']
          >['difficultyResults'],
          gradeLevelResults: (result.gradeLevelResults ?? {}) as NonNullable<
            AttemptSnapshotState['result']
          >['gradeLevelResults'],
        }
      : null,
  };
}

export class PrismaAttemptRepository implements AttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async start(attempt: Attempt): Promise<AttemptSnapshotState> {
    try {
      const row = await this.prisma.attempt.create({
        data: {
          attemptId: attempt.state.attemptId,
          schoolId: attempt.state.schoolId,
          userId: attempt.state.userId,
          examId: attempt.state.snapshot.examId,
          status: attempt.state.status,
          examSnapshot: attempt.state.snapshot as unknown as Prisma.InputJsonValue,
          startedAt: attempt.state.startedAt,
          expiresAt: attempt.state.expiresAt,
          totalQuestions: attempt.state.snapshot.questions.length,
        },
        include: { answers: true },
      });
      return toState(row);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        const existing = await this.prisma.attempt.findFirst({
          where: {
            schoolId: attempt.state.schoolId,
            userId: attempt.state.userId,
            examId: attempt.state.snapshot.examId,
            status: 'IN_PROGRESS',
          },
          include: { answers: true },
        });
        if (existing) return toState(existing);
      }
      throw new AttemptsError('ATT-006');
    }
  }

  async findById(input: {
    attemptId: string;
    schoolId: string;
    userId: string;
  }): Promise<AttemptSnapshotState | null> {
    const row = await this.prisma.attempt.findFirst({ where: input, include: { answers: true } });
    return row ? toState(row) : null;
  }

  async listByUser(input: {
    schoolId: string;
    userId: string;
    examId?: string;
  }): Promise<readonly AttemptSnapshotState[]> {
    const rows = await this.prisma.attempt.findMany({
      where: {
        schoolId: input.schoolId,
        userId: input.userId,
        ...(input.examId ? { examId: input.examId } : {}),
      },
      include: { answers: true },
      orderBy: { startedAt: 'desc' },
    });
    return rows.map(toState);
  }

  async listSubmittedBySchool(schoolId: string): Promise<readonly AttemptSnapshotState[]> {
    const rows = await this.prisma.attempt.findMany({
      where: { schoolId, status: 'SUBMITTED' },
      include: { answers: true },
      orderBy: { submittedAt: 'asc' },
    });
    return rows.map(toState);
  }

  async saveAnswer(attempt: Attempt): Promise<AttemptSnapshotState> {
    const answer = attempt.state.answers.at(-1);
    if (!answer) throw new AttemptsError('ATT-001');
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const active = await tx.attempt.findFirst({
          where: {
            attemptId: attempt.state.attemptId,
            schoolId: attempt.state.schoolId,
            userId: attempt.state.userId,
            status: 'IN_PROGRESS',
          },
          select: { attemptId: true },
        });
        if (!active) throw new AttemptsError('ATT-003');
        await tx.attemptAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: attempt.state.attemptId,
              questionId: answer.questionId,
            },
          },
          update: {
            questionVersion: answer.questionVersion,
            selectedOption: answer.selectedOption,
            isCorrect: answer.isCorrect,
            answeredAt: answer.answeredAt,
          },
          create: {
            attemptId: attempt.state.attemptId,
            questionId: answer.questionId,
            questionVersion: answer.questionVersion,
            selectedOption: answer.selectedOption,
            isCorrect: answer.isCorrect,
            answeredAt: answer.answeredAt,
          },
        });
        return tx.attempt.findUniqueOrThrow({
          where: { attemptId: attempt.state.attemptId },
          include: { answers: true },
        });
      });
      return toState(row);
    } catch (error) {
      if (error instanceof AttemptsError) throw error;
      throw new AttemptsError('ATT-006');
    }
  }

  async finish(attempt: Attempt): Promise<AttemptSnapshotState> {
    const result = attempt.state.result;
    const completedAt = attempt.state.submittedAt;
    if (!result || !completedAt) throw new AttemptsError('ATT-001');
    const completedEvent: AttemptCompletedEvent = {
      eventId: randomUUID(),
      eventName: 'AttemptCompleted',
      aggregateId: attempt.state.attemptId,
      aggregateType: 'Attempt',
      schemaVersion: 1,
      schoolId: attempt.state.schoolId,
      occurredAt: completedAt.toISOString(),
      correlationId: attempt.state.attemptId,
      causationId: attempt.state.attemptId,
      payload: {
        attemptId: attempt.state.attemptId,
        userId: attempt.state.userId,
        schoolId: attempt.state.schoolId,
        examId: attempt.state.snapshot.examId,
        score: result.score,
        percentage: result.percentage,
        correctAnswers: result.correctAnswers,
        timeSpentSeconds: Math.max(
          0,
          Math.round((completedAt.getTime() - attempt.state.startedAt.getTime()) / 1000),
        ),
      },
    };
    assertEventContract(completedEvent);
    try {
      const updated = await this.prisma.attempt.updateMany({
        where: {
          attemptId: attempt.state.attemptId,
          schoolId: attempt.state.schoolId,
          userId: attempt.state.userId,
          status: 'IN_PROGRESS',
        },
        data: {
          status: attempt.state.status,
          submittedAt: completedAt,
          score: result.score,
          correctAnswers: result.correctAnswers,
          percentage: result.percentage,
          topicResults: result.topicResults as unknown as Prisma.InputJsonValue,
          result: result as unknown as Prisma.InputJsonValue,
          completedEvent: completedEvent as unknown as Prisma.InputJsonValue,
        },
      });
      const row = await this.prisma.attempt.findFirst({
        where: {
          attemptId: attempt.state.attemptId,
          schoolId: attempt.state.schoolId,
          userId: attempt.state.userId,
        },
        include: { answers: true },
      });
      if (!row) throw new AttemptsError('ATT-002');
      if (updated.count === 0 && row.status === 'IN_PROGRESS') throw new AttemptsError('ATT-006');
      return toState(row);
    } catch (error) {
      if (error instanceof AttemptsError) throw error;
      throw new AttemptsError('ATT-006');
    }
  }
}

import type { Prisma, PrismaClient } from '@prisma/client';
import { MockExam, MockExamsError, type MockExamStatus } from '../domain/mock-exam';
import type { ExamQuestionView, MockExamRepository, MockExamView } from '../domain/ports';

const examInclude = {
  questions: {
    include: {
      question: { include: { options: { orderBy: { label: 'asc' as const } } } },
    },
    orderBy: { position: 'asc' as const },
  },
} satisfies Prisma.MockExamInclude;

type ExamRow = Prisma.MockExamGetPayload<{ include: typeof examInclude }>;

function toView(row: ExamRow): MockExamView {
  const questions: ExamQuestionView[] = row.questions.map((item) => ({
    questionId: item.questionId,
    questionVersion: item.questionVersion,
    position: item.position,
    title: item.question.title,
    statement: item.question.statement,
    level: item.question.level,
    options: item.question.options.map(({ label, content }) => ({ label, content })),
  }));
  return {
    examId: row.examId,
    title: row.title,
    description: row.description,
    schoolId: row.schoolId,
    level: row.level,
    status: row.status as MockExamStatus,
    durationMinutes: row.durationMinutes,
    availableFrom: row.availableFrom,
    availableUntil: row.availableUntil,
    questions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

export class PrismaMockExamRepository implements MockExamRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(exam: MockExam): Promise<MockExamView> {
    try {
      const row = await this.prisma.mockExam.create({
        data: {
          examId: exam.examId,
          title: exam.title,
          description: exam.description,
          schoolId: exam.schoolId,
          level: exam.level,
          status: exam.status,
          durationMinutes: exam.durationMinutes,
          availableFrom: exam.availableFrom,
          availableUntil: exam.availableUntil,
          createdAt: exam.createdAt,
          updatedAt: exam.updatedAt,
          publishedAt: exam.publishedAt,
          questions: {
            create: exam.questions.map(({ questionId, questionVersion, position }) => ({
              position,
              question: {
                connect: { questionId_version: { questionId, version: questionVersion } },
              },
            })),
          },
        },
        include: examInclude,
      });
      return toView(row);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        ((error as { code?: string }).code === 'P2003' ||
          (error as { code?: string }).code === 'P2025')
      ) {
        throw new MockExamsError('EXM-001');
      }
      throw error;
    }
  }

  async findById(examId: string, schoolId: string): Promise<MockExamView | null> {
    const row = await this.prisma.mockExam.findFirst({
      where: { examId, schoolId },
      include: examInclude,
    });
    return row ? toView(row) : null;
  }

  async list(input: {
    schoolId: string;
    status?: MockExamStatus;
    availableAt?: Date;
  }): Promise<MockExamView[]> {
    const row = await this.prisma.mockExam.findMany({
      where: {
        schoolId: input.schoolId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.availableAt
          ? {
              status: 'PUBLISHED',
              AND: [
                { OR: [{ availableFrom: null }, { availableFrom: { lte: input.availableAt } }] },
                { OR: [{ availableUntil: null }, { availableUntil: { gte: input.availableAt } }] },
              ],
            }
          : {}),
      },
      include: examInclude,
      orderBy: [{ createdAt: 'desc' }, { examId: 'asc' }],
    });
    return row.map(toView);
  }

  async publish(exam: MockExam): Promise<MockExamView> {
    return this.updateStatus(exam, 'DRAFT');
  }

  async archive(exam: MockExam): Promise<MockExamView> {
    return this.updateStatus(exam, 'PUBLISHED');
  }

  private async updateStatus(exam: MockExam, expectedStatus: 'DRAFT' | 'PUBLISHED') {
    try {
      await this.prisma.$transaction(async (tx) => {
        if (expectedStatus === 'DRAFT') {
          const examQuestions = await tx.mockExamQuestion.findMany({
            where: { examId: exam.examId },
            select: { questionId: true, questionVersion: true },
          });
          const publishedQuestions = await tx.question.count({
            where: {
              OR: examQuestions.map(({ questionId, questionVersion }) => ({
                questionId,
                version: questionVersion,
                publishedAt: { not: null },
              })),
            },
          });
          if (examQuestions.length === 0 || publishedQuestions !== examQuestions.length) {
            throw new MockExamsError('EXM-003');
          }
        }
        const result = await tx.mockExam.updateMany({
          where: { examId: exam.examId, schoolId: exam.schoolId, status: expectedStatus },
          data: {
            status: exam.status,
            updatedAt: exam.updatedAt,
            publishedAt: exam.publishedAt,
          },
        });
        if (result.count !== 1) {
          const exists = await tx.mockExam.findFirst({
            where: { examId: exam.examId, schoolId: exam.schoolId },
            select: { examId: true },
          });
          throw new MockExamsError(exists ? 'EXM-003' : 'EXM-002');
        }
      });
      const saved = await this.findById(exam.examId, exam.schoolId);
      if (!saved) throw new MockExamsError('EXM-002');
      return saved;
    } catch (error) {
      if (error instanceof MockExamsError) throw error;
      throw new MockExamsError('EXM-006');
    }
  }
}

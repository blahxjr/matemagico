import type { Prisma, PrismaClient } from '@prisma/client';
import { Question, type QuestionStatus } from '../domain/question';
import { QuestionsError } from '../domain/questions-error';
import type {
  AddQuestionResult,
  ImportExecutionRepository,
  Page,
  QuestionFilter,
  QuestionRepository,
} from '../domain/ports';

type Row = Prisma.QuestionGetPayload<{ include: { options: true; tags: true } }>;

const withOptions = {
  options: { orderBy: { label: 'asc' as const } },
  tags: { orderBy: { tag: 'asc' as const } },
};

const restore = (row: Row): Question =>
  Question.restore({
    questionId: row.questionId,
    version: row.version,
    title: row.title,
    statement: row.statement,
    level: row.level,
    topicId: row.topicId,
    status: row.status as QuestionStatus,
    sourceName: row.sourceName,
    sourceYear: row.sourceYear,
    sourceReference: row.sourceReference,
    sourceNotes: row.sourceNotes,
    sourceType: row.sourceType,
    legacyId: row.legacyId,
    authorName: row.authorName,
    authorType: row.authorType,
    authorVerified: row.authorVerified,
    gradeLevel: row.gradeLevel,
    difficulty: row.difficulty,
    explanation: row.explanation,
    imageUrl: row.imageUrl,
    imageStatus: row.imageStatus,
    imageHash: row.imageHash,
    tags: row.tags.map(({ tag }) => tag),
    options: row.options.map(({ optionId, label, content, isCorrect }) => ({
      optionId,
      label,
      content,
      isCorrect,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  });

const isUniqueViolation = (error: unknown) => (error as { code?: string }).code === 'P2002';

export class PrismaQuestionRepository implements QuestionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private data(question: Question): Prisma.QuestionCreateInput {
    return {
      questionId: question.id,
      version: question.version,
      title: question.content.title,
      statement: question.content.statement,
      level: question.content.level,
      topicId: question.content.topicId,
      status: question.status,
      sourceName: question.content.sourceName,
      sourceYear: question.content.sourceYear,
      sourceReference: question.content.sourceReference,
      sourceNotes: question.content.sourceNotes,
      sourceType: question.content.sourceType,
      legacyId: question.content.legacyId,
      authorName: question.content.authorName,
      authorType: question.content.authorType,
      authorVerified: question.content.authorVerified,
      gradeLevel: question.content.gradeLevel,
      difficulty: question.content.difficulty,
      explanation: question.content.explanation,
      imageUrl: question.content.imageUrl,
      imageStatus: question.content.imageStatus,
      imageHash: question.content.imageHash,
      isCurrent: true,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      publishedAt: question.publishedAt,
      options: {
        create: question.options.map(({ optionId, label, content, isCorrect }) => ({
          optionId,
          label,
          content,
          isCorrect,
        })),
      },
      tags: { create: question.content.tags.map((tag) => ({ tag })) },
    };
  }

  async add(question: Question): Promise<AddQuestionResult> {
    try {
      await this.prisma.question.create({ data: this.data(question) });
      return 'CREATED';
    } catch (error) {
      if (isUniqueViolation(error)) return 'CONFLICT';
      throw error;
    }
  }

  async addVersion(question: Question): Promise<AddQuestionResult> {
    try {
      await this.prisma.$transaction([
        this.prisma.question.updateMany({
          where: { questionId: question.id, isCurrent: true },
          data: { isCurrent: false },
        }),
        this.prisma.question.create({ data: this.data(question) }),
      ]);
      return 'CREATED';
    } catch (error) {
      if (isUniqueViolation(error)) return 'CONFLICT';
      throw error;
    }
  }

  async findCurrent(questionId: string): Promise<Question | null> {
    const row = await this.prisma.question.findFirst({
      where: { questionId, isCurrent: true },
      include: withOptions,
    });
    return row ? restore(row) : null;
  }

  async findVersion(questionId: string, version: number): Promise<Question | null> {
    const row = await this.prisma.question.findUnique({
      where: { questionId_version: { questionId, version } },
      include: withOptions,
    });
    return row ? restore(row) : null;
  }

  async findPublished(questionId: string): Promise<Question | null> {
    const row = await this.prisma.question.findFirst({
      where: { questionId, status: 'PUBLISHED' },
      include: withOptions,
    });
    return row ? restore(row) : null;
  }

  async saveStatus(question: Question): Promise<void> {
    const allowedPreviousStatuses: QuestionStatus[] =
      question.status === 'IN_REVIEW'
        ? ['IMPORTED', 'APPROVED', 'REJECTED']
        : question.status === 'APPROVED' || question.status === 'REJECTED'
          ? ['IN_REVIEW']
          : [];
    const result = await this.prisma.question.updateMany({
      where: {
        questionId: question.id,
        version: question.version,
        ...(question.status === 'ARCHIVED'
          ? { status: { not: 'ARCHIVED' } }
          : { status: { in: allowedPreviousStatuses }, isCurrent: true }),
      },
      data: { status: question.status, updatedAt: question.updatedAt },
    });
    if (result.count !== 1) throw new QuestionsError('QST-005');
  }

  async save(question: Question): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.question.updateMany({
        where: {
          questionId: question.id,
          version: question.version,
          status: 'IN_REVIEW',
          isCurrent: true,
        },
        data: {
          title: question.content.title,
          statement: question.content.statement,
          level: question.content.level,
          topicId: question.content.topicId,
          status: question.status,
          sourceName: question.content.sourceName,
          sourceYear: question.content.sourceYear,
          sourceReference: question.content.sourceReference,
          sourceNotes: question.content.sourceNotes,
          sourceType: question.content.sourceType,
          legacyId: question.content.legacyId,
          authorName: question.content.authorName,
          authorType: question.content.authorType,
          authorVerified: question.content.authorVerified,
          gradeLevel: question.content.gradeLevel,
          difficulty: question.content.difficulty,
          explanation: question.content.explanation,
          imageUrl: question.content.imageUrl,
          imageStatus: question.content.imageStatus,
          imageHash: question.content.imageHash,
          updatedAt: question.updatedAt,
          publishedAt: null,
        },
      });
      if (result.count !== 1) throw new QuestionsError('QST-005');

      await tx.questionOption.deleteMany({
        where: { questionId: question.id, version: question.version },
      });
      if (question.options.length > 0) {
        await tx.questionOption.createMany({
          data: question.options.map(({ optionId, label, content, isCorrect }) => ({
            optionId,
            questionId: question.id,
            version: question.version,
            label,
            content,
            isCorrect,
          })),
        });
      }
      await tx.questionTag.deleteMany({
        where: { questionId: question.id, version: question.version },
      });
      if (question.content.tags.length > 0) {
        await tx.questionTag.createMany({
          data: question.content.tags.map((tag) => ({
            questionId: question.id,
            version: question.version,
            tag,
          })),
        });
      }
    });
  }

  async publish(question: Question): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.question.updateMany({
        where: {
          questionId: question.id,
          status: 'PUBLISHED',
          version: { not: question.version },
        },
        data: { status: 'ARCHIVED', updatedAt: question.updatedAt },
      });
      const result = await tx.question.updateMany({
        where: {
          questionId: question.id,
          version: question.version,
          status: 'APPROVED',
          isCurrent: true,
        },
        data: {
          status: 'PUBLISHED',
          publishedAt: question.publishedAt,
          updatedAt: question.updatedAt,
        },
      });
      if (result.count !== 1) throw new QuestionsError('QST-005');
    });
  }

  async list(filter: QuestionFilter, page: Page) {
    const where: Prisma.QuestionWhereInput = {
      ...(filter.status === 'PUBLISHED'
        ? { status: 'PUBLISHED' }
        : { isCurrent: true, ...(filter.status ? { status: filter.status } : {}) }),
      ...(filter.level ? { level: filter.level } : {}),
      ...(filter.topicId ? { topicId: filter.topicId } : {}),
      ...(filter.sourceYear !== undefined ? { sourceYear: filter.sourceYear } : {}),
      ...(filter.gradeLevel ? { gradeLevel: filter.gradeLevel } : {}),
      ...(filter.difficulty ? { difficulty: filter.difficulty } : {}),
      ...(filter.sourceType ? { sourceType: filter.sourceType } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        include: withOptions,
        orderBy: [{ createdAt: 'asc' }, { questionId: 'asc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.prisma.question.count({ where }),
    ]);
    return { items: rows.map(restore), total };
  }

  async existsBySource(source: {
    sourceName: string;
    sourceYear: number | null;
    sourceReference: string;
  }): Promise<boolean> {
    const count = await this.prisma.question.count({ where: source });
    return count > 0;
  }

  async existsByFingerprint(fingerprint: string): Promise<boolean> {
    const rows = await this.prisma.question.findMany({
      include: { options: { orderBy: { label: 'asc' } } },
    });
    return rows.some((row) => fingerprintFor(row.statement, row.options) === fingerprint);
  }

  async countByStatus(): Promise<Record<QuestionStatus, number>> {
    const grouped = await this.prisma.question.groupBy({ by: ['status'], _count: { _all: true } });
    return Object.fromEntries(
      ['IMPORTED', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED'].map((status) => [
        status,
        grouped.find((row) => row.status === status)?._count._all ?? 0,
      ]),
    ) as Record<QuestionStatus, number>;
  }
}

export class PrismaImportExecutionRepository implements ImportExecutionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(input: {
    importExecutionId: string;
    sourceFileName: string | null;
    worksheetName: string;
    processed: number;
    created: number;
    duplicates: number;
    errors: number;
    createdAt: Date;
  }): Promise<void> {
    await this.prisma.importExecution.create({ data: input });
  }

  async totalDuplicates(): Promise<number> {
    const total = await this.prisma.importExecution.aggregate({ _sum: { duplicates: true } });
    return total._sum.duplicates ?? 0;
  }
}

function normalizeFingerprintValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}

function fingerprintFor(
  statement: string,
  options: readonly { label: string; content: string; isCorrect: boolean }[],
): string {
  const normalizedOptions = [...options]
    .sort((left, right) => left.label.localeCompare(right.label))
    .map((option) => `${option.label}:${normalizeFingerprintValue(option.content)}`)
    .join('\u001e');
  const answer = options.find((option) => option.isCorrect)?.label ?? '';
  return [normalizeFingerprintValue(statement), normalizedOptions, answer].join('\u001f');
}

import type { Prisma, PrismaClient } from '@prisma/client';
import { Question, type QuestionLevel, type QuestionStatus } from '../domain/question';
import type { AddQuestionResult, Page, QuestionFilter, QuestionRepository } from '../domain/ports';

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
    level: row.level as QuestionLevel,
    topicId: row.topicId,
    status: row.status as QuestionStatus,
    sourceName: row.sourceName,
    sourceYear: row.sourceYear,
    sourceReference: row.sourceReference,
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
    await this.prisma.question.update({
      where: { questionId_version: { questionId: question.id, version: question.version } },
      data: { status: question.status, updatedAt: question.updatedAt },
    });
  }

  async save(question: Question): Promise<void> {
    await this.prisma.question.update({
      where: { questionId_version: { questionId: question.id, version: question.version } },
      data: {
        ...this.data(question),
        questionId: undefined,
        version: undefined,
        options: {
          deleteMany: {},
          create: question.options.map(({ optionId, label, content, isCorrect }) => ({
            optionId,
            label,
            content,
            isCorrect,
          })),
        },
        tags: { deleteMany: {}, create: question.content.tags.map((tag) => ({ tag })) },
      },
    });
  }

  async publish(question: Question): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.question.updateMany({
        where: {
          questionId: question.id,
          status: 'PUBLISHED',
          version: { not: question.version },
        },
        data: { status: 'ARCHIVED', updatedAt: question.updatedAt },
      }),
      this.prisma.question.update({
        where: { questionId_version: { questionId: question.id, version: question.version } },
        data: {
          status: 'PUBLISHED',
          publishedAt: question.publishedAt,
          updatedAt: question.updatedAt,
        },
      }),
    ]);
  }

  async list(filter: QuestionFilter, page: Page) {
    const where: Prisma.QuestionWhereInput = {
      ...(filter.status === 'PUBLISHED'
        ? { status: 'PUBLISHED' }
        : { isCurrent: true, ...(filter.status ? { status: filter.status } : {}) }),
      ...(filter.level ? { level: filter.level } : {}),
      ...(filter.topicId ? { topicId: filter.topicId } : {}),
      ...(filter.sourceYear !== undefined ? { sourceYear: filter.sourceYear } : {}),
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
    const [statement, options, answer] = fingerprint.split('\u001f');
    if (!statement || !options || !answer) return false;
    const count = await this.prisma.question.count({
      where: {
        statement,
        options: { every: { content: { in: options.split('\u001e') } } },
      },
    });
    return count > 0;
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

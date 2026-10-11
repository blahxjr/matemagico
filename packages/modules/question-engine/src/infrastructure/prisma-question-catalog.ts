import type { PrismaClient } from '@prisma/client';
import type { QuestionCatalog, QuestionCandidate } from '../domain/question-set';

export class PrismaQuestionCatalog implements QuestionCatalog {
  constructor(private readonly prisma: PrismaClient) {}

  async findPublishedCurrent(input: {
    level: 'OBMEP_MIRIM' | 'OBMEP_N1' | 'OBMEP_N2' | 'OBMEP_N3';
    topicId: string;
  }): Promise<readonly QuestionCandidate[]> {
    const rows = await this.prisma.question.findMany({
      where: {
        level: input.level,
        topicId: input.topicId,
        status: 'PUBLISHED',
        isCurrent: true,
      },
      select: {
        questionId: true,
        version: true,
        level: true,
        topicId: true,
        status: true,
        isCurrent: true,
      },
      orderBy: [{ questionId: 'asc' }],
    });
    return rows.map((row) => ({
      questionId: row.questionId,
      questionVersion: row.version,
      level: row.level,
      topicId: row.topicId,
      status: row.status,
      isCurrent: row.isCurrent,
    }));
  }
}

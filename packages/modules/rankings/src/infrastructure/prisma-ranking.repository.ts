import type { PrismaClient } from '@prisma/client';
import type { RankingEntry } from '../domain/ranking';
import type { RankingRepository } from '../domain/ports';

type Row = {
  id: string;
  schoolId: string;
  examId: string;
  studentId: string;
  attemptId: string;
  score: { toNumber(): number };
  correctAnswers: number;
  timeSpentSeconds: number;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const toEntry = (row: Row): RankingEntry => ({ ...row, score: row.score.toNumber() });

export class PrismaRankingRepository implements RankingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertByAttempt(entry: RankingEntry): Promise<void> {
    const { id, createdAt, attemptId, ...mutable } = entry;
    await this.prisma.rankingEntry.upsert({
      where: { attemptId },
      create: { id, createdAt, attemptId, ...mutable },
      update: { ...mutable, updatedAt: entry.updatedAt },
    });
  }

  async listBySchool(schoolId: string): Promise<readonly RankingEntry[]> {
    return (await this.prisma.rankingEntry.findMany({ where: { schoolId } })).map(toEntry);
  }

  async listByExam(schoolId: string, examId: string): Promise<readonly RankingEntry[]> {
    return (await this.prisma.rankingEntry.findMany({ where: { schoolId, examId } })).map(toEntry);
  }
}

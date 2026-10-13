export { RankingsError, compareRanking, rankExam, rankSchool } from './domain/ranking';
export type { RankedItem, RankingEntry } from './domain/ranking';
export type { Clock, IdGenerator, RankingRepository } from './domain/ports';
export {
  UpdateRankingFromAttemptCompleted,
  RankingProjectionHandler,
  GetSchoolRanking,
  GetExamRanking,
} from './application/ranking.services';
export type { AttemptCompletedInput } from './application/ranking.services';
export { PrismaRankingRepository } from './infrastructure/prisma-ranking.repository';

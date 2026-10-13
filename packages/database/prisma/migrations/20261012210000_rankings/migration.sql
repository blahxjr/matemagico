CREATE TABLE "RankingEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "timeSpentSeconds" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RankingEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RankingEntry_non_negative" CHECK ("correctAnswers" >= 0 AND "timeSpentSeconds" >= 0)
);

CREATE UNIQUE INDEX "RankingEntry_attemptId_key" ON "RankingEntry"("attemptId");
CREATE INDEX "RankingEntry_schoolId_studentId_idx" ON "RankingEntry"("schoolId", "studentId");
CREATE INDEX "RankingEntry_schoolId_examId_idx" ON "RankingEntry"("schoolId", "examId");

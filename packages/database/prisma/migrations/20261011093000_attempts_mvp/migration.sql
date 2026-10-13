CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

CREATE TABLE "Attempt" (
    "attemptId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL,
    "examSnapshot" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "score" DECIMAL(5,2),
    "correctAnswers" INTEGER,
    "totalQuestions" INTEGER NOT NULL,
    "percentage" DECIMAL(5,2),
    "topicResults" JSONB,
    "result" JSONB,
    "completedEvent" JSONB,
    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("attemptId"),
    CONSTRAINT "Attempt_totalQuestions_positive" CHECK ("totalQuestions" > 0),
    CONSTRAINT "Attempt_expires_after_start" CHECK ("expiresAt" > "startedAt")
);

CREATE TABLE "AttemptAnswer" (
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionVersion" INTEGER NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("attemptId", "questionId")
);

CREATE INDEX "Attempt_schoolId_userId_status_idx" ON "Attempt"("schoolId", "userId", "status");
CREATE INDEX "Attempt_schoolId_examId_idx" ON "Attempt"("schoolId", "examId");
CREATE UNIQUE INDEX "Attempt_schoolId_userId_examId_status_key" ON "Attempt"("schoolId", "userId", "examId", "status");

ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "Attempt"("attemptId") ON DELETE CASCADE ON UPDATE CASCADE;
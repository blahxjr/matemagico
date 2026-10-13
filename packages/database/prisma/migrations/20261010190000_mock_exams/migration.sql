CREATE TYPE "MockExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "MockExam" (
    "examId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "schoolId" TEXT NOT NULL,
    "level" "QuestionLevel" NOT NULL,
    "status" "MockExamStatus" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "MockExam_pkey" PRIMARY KEY ("examId")
);

CREATE TABLE "MockExamQuestion" (
    "examId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionVersion" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "MockExamQuestion_pkey" PRIMARY KEY ("examId", "position")
);

CREATE UNIQUE INDEX "MockExamQuestion_examId_questionId_key" ON "MockExamQuestion"("examId", "questionId");
CREATE INDEX "MockExamQuestion_questionId_questionVersion_idx" ON "MockExamQuestion"("questionId", "questionVersion");
CREATE INDEX "MockExam_schoolId_status_availableFrom_availableUntil_idx" ON "MockExam"("schoolId", "status", "availableFrom", "availableUntil");

ALTER TABLE "MockExamQuestion" ADD CONSTRAINT "MockExamQuestion_examId_fkey"
    FOREIGN KEY ("examId") REFERENCES "MockExam"("examId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MockExamQuestion" ADD CONSTRAINT "MockExamQuestion_questionId_questionVersion_fkey"
    FOREIGN KEY ("questionId", "questionVersion") REFERENCES "Question"("questionId", "version") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MockExam" ADD CONSTRAINT "MockExam_durationMinutes_positive"
    CHECK ("durationMinutes" > 0);
ALTER TABLE "MockExam" ADD CONSTRAINT "MockExam_availability_window_valid"
    CHECK ("availableFrom" IS NULL OR "availableUntil" IS NULL OR "availableUntil" >= "availableFrom");

-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "QuestionLevel" AS ENUM ('OBMEP_MIRIM', 'OBMEP_N1', 'OBMEP_N2', 'OBMEP_N3');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Topic" (
    "topicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TopicStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("topicId")
);

-- CreateTable
CREATE TABLE "Question" (
    "questionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "level" "QuestionLevel" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceYear" INTEGER,
    "sourceReference" TEXT,
    "status" "QuestionStatus" NOT NULL,
    "topicId" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Question_pkey" PRIMARY KEY ("questionId","version")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "optionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("optionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "Question_status_level_topicId_idx" ON "Question"("status", "level", "topicId");

-- CreateIndex
CREATE INDEX "Question_isCurrent_status_idx" ON "Question"("isCurrent", "status");

-- CreateIndex
CREATE INDEX "Question_sourceName_sourceYear_sourceReference_idx" ON "Question"("sourceName", "sourceYear", "sourceReference");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_version_label_key" ON "QuestionOption"("questionId", "version", "label");

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_version_fkey" FOREIGN KEY ("questionId", "version") REFERENCES "Question"("questionId", "version") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariants that Prisma cannot express: at most one current and one published version per question.
CREATE UNIQUE INDEX "Question_one_current_per_question" ON "Question"("questionId") WHERE "isCurrent";
CREATE UNIQUE INDEX "Question_one_published_per_question" ON "Question"("questionId") WHERE "status" = 'PUBLISHED';

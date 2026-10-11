CREATE TYPE "AuthorType" AS ENUM ('AUTHOR', 'ORGANIZATION', 'UNKNOWN');
CREATE TYPE "SourceType" AS ENUM ('OLYMPIAD', 'EXAM', 'BOOK', 'INTERNAL', 'UNKNOWN');
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "ImageStatus" AS ENUM ('PENDING', 'VALID', 'BROKEN', 'MISSING');
CREATE TYPE "QuestionStatus_new" AS ENUM ('IMPORTED', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

DROP INDEX "Question_one_published_per_question";

ALTER TABLE "Question"
  ADD COLUMN "sourceType" "SourceType" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "legacyId" TEXT,
  ADD COLUMN "authorName" TEXT NOT NULL DEFAULT 'Unknown',
  ADD COLUMN "authorType" "AuthorType" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "authorVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "gradeLevel" TEXT,
  ADD COLUMN "difficulty" "QuestionDifficulty",
  ADD COLUMN "explanation" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "imageStatus" "ImageStatus" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "imageHash" TEXT;

ALTER TABLE "Question"
  ALTER COLUMN "status" TYPE "QuestionStatus_new"
  USING (CASE WHEN "status"::text = 'DRAFT' THEN 'IMPORTED' ELSE "status"::text END)::"QuestionStatus_new";
DROP TYPE "QuestionStatus";
ALTER TYPE "QuestionStatus_new" RENAME TO "QuestionStatus";
CREATE UNIQUE INDEX "Question_one_published_per_question" ON "Question"("questionId") WHERE "status" = 'PUBLISHED';

ALTER TABLE "Topic" ADD COLUMN "parentTopicId" TEXT;
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_parentTopicId_fkey"
  FOREIGN KEY ("parentTopicId") REFERENCES "Topic"("topicId") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "QuestionTag" (
  "questionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "tag" TEXT NOT NULL,
  CONSTRAINT "QuestionTag_pkey" PRIMARY KEY ("questionId", "version", "tag"),
  CONSTRAINT "QuestionTag_questionId_version_fkey"
    FOREIGN KEY ("questionId", "version") REFERENCES "Question"("questionId", "version")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "QuestionTag_tag_idx" ON "QuestionTag"("tag");
CREATE INDEX "Question_legacyId_idx" ON "Question"("legacyId");

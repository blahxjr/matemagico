ALTER TABLE "Question"
  ALTER COLUMN "level" DROP NOT NULL,
  ADD COLUMN "sourceNotes" TEXT;

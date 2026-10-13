CREATE TABLE "ImportExecution" (
  "importExecutionId" TEXT NOT NULL,
  "sourceFileName" TEXT,
  "worksheetName" TEXT NOT NULL,
  "processed" INTEGER NOT NULL,
  "created" INTEGER NOT NULL,
  "duplicates" INTEGER NOT NULL,
  "errors" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportExecution_pkey" PRIMARY KEY ("importExecutionId")
);

CREATE INDEX "ImportExecution_createdAt_idx" ON "ImportExecution"("createdAt");
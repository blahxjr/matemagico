CREATE TABLE "AuditEvent" (
    "auditId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "actorUserId" TEXT,
    "actorSchoolId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "reason" TEXT,
    "metadata" JSONB NOT NULL,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("auditId")
);

CREATE INDEX "AuditEvent_actorUserId_occurredAt_idx" ON "AuditEvent"("actorUserId", "occurredAt");
CREATE INDEX "AuditEvent_actorSchoolId_occurredAt_idx" ON "AuditEvent"("actorSchoolId", "occurredAt");
CREATE INDEX "AuditEvent_targetType_targetId_occurredAt_idx" ON "AuditEvent"("targetType", "targetId", "occurredAt");

CREATE TABLE "LoginAttemptCounter" (
    "key" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    CONSTRAINT "LoginAttemptCounter_pkey" PRIMARY KEY ("key", "windowStartedAt")
);

CREATE INDEX "LoginAttemptCounter_windowStartedAt_idx" ON "LoginAttemptCounter"("windowStartedAt");

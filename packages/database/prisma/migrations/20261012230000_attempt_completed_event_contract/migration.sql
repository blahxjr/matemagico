UPDATE "Attempt"
SET "completedEvent" =
    "completedEvent"
    || jsonb_build_object(
        'eventId',
        COALESCE("completedEvent"->>'eventId', 'attempt-completed:' || "attemptId"),
        'correlationId',
        COALESCE("completedEvent"->>'correlationId', "attemptId"),
        'causationId',
        COALESCE("completedEvent"->>'causationId', "attemptId"),
        'occurredAt',
        COALESCE(
            "completedEvent"->>'occurredAt',
            to_char("submittedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
    )
    || jsonb_build_object(
        'payload',
        "completedEvent"->'payload'
        || jsonb_build_object(
            'correctAnswers', "correctAnswers",
            'timeSpentSeconds',
            GREATEST(0, ROUND(EXTRACT(EPOCH FROM ("submittedAt" - "startedAt")))::INTEGER)
        )
    )
WHERE "completedEvent"->>'eventName' = 'AttemptCompleted'
  AND "status" = 'SUBMITTED'
  AND "submittedAt" IS NOT NULL;

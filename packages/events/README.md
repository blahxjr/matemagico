# Events

`src/contracts.ts` is the versioned registry and runtime validator for domain-event envelopes.
Events include stable identity, aggregate, timestamp, schema version, correlation and causation
metadata, and a school scope when they describe a school-owned fact.

`AttemptCompleted` carries the attempt, user, school, exam, score, and percentage. Its
`correctAnswers` and `timeSpentSeconds` metrics are optional additions to schema version 1 for
backward compatibility; current producers persist both so ranking projections can be rebuilt
from the event.

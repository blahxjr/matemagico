# Next Steps - MateMágico Champions

**Last Updated**: 2026-10-11

## Immediate

1. Prompt 04.1 editorial import is implemented; preserve the `IMPORTED -> IN_REVIEW -> APPROVED -> PUBLISHED` gate and do not import unauthorized OBMEP content into a persistent database.
2. **Prompt 06**: complete Attempts + AutoCorrect + Outbox + Ranking Base. Keep using frozen `(questionId, questionVersion)` references from published exams.
3. Decide question-bank curation (global vs per-school) and obtain OBMEP content authorization (ADR-0011).
4. Confirm CI and migrations on the intended test database; avoid using a developer database for destructive DB suites.
5. Persistent rate-limit adapter, password reset, per-user school quota (see `TECH-DEBT.md` items 14-19).

## Then

- Attempts, automatic grading, simple ranking (see `docs/product/MVP-SCOPE.md`).
- Outbox pattern, audit trail, metrics/tracing (non-blocking).
- Formal approval of ADR-0001–0005 and 0009.

## Not in MVP

AI, tournaments/leagues/seasons, badges/certificates, advanced analytics.

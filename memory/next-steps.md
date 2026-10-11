# Next Steps - MateMágico Champions

**Last Updated**: 2026-10-10

## Immediate

1. Confirm the first green CI run (migrate deploy, seed, `test:db`) and record it in `release-history.md`.
2. **Prompt 06**: Attempts + AutoCorrect + Outbox + Ranking Base. Start from the frozen `(questionId, questionVersion)` references returned by `StartExam`; do not recalculate the published exam's question set.
3. Decide question-bank curation (global vs per-school) and obtain OBMEP content authorization (ADR-0011).
4. Persistent rate-limit adapter, password reset, per-user school quota (see `TECH-DEBT.md` items 14-19).

## Then

- Attempts, automatic grading, simple ranking (see `docs/product/MVP-SCOPE.md`).
- Outbox pattern, audit trail, metrics/tracing (non-blocking).
- Formal approval of ADR-0001–0005 and 0009.

## Not in MVP

AI, tournaments/leagues/seasons, badges/certificates, advanced analytics.

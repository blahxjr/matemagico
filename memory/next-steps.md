# Next Steps - MateMágico Champions

**Last Updated**: 2026-10-13

## Immediate

1. Run the GitHub Actions workflow against the release candidate and confirm every required gate, including dependency review and secret scanning, passes.
2. Deploy the validated Compose stack to a dedicated real staging environment with URL-safe DB credentials, provision a dedicated smoke school, and execute `npm run smoke-test`.
3. Create `v0.2.0-mvp` only after remote CI and real staging smoke evidence are recorded. Local validation is green; no tag has been created.
4. Keep the `IMPORTED -> IN_REVIEW -> APPROVED -> PUBLISHED` editorial gate and immutable published-exam contract.
5. After release, decide question-bank curation (global vs per-school), obtain OBMEP content authorization (ADR-0011), and plan shared permission-cache invalidation before multiple API replicas.

## Then

- Distributed tracing/OpenTelemetry and outbox for Membership/User/School events remain open.
- Formal approval of ADR-0001–0005 and 0009.

## Not in MVP

AI, tournaments/leagues/seasons, badges/certificates, advanced analytics.

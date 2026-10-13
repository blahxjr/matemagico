# Project State - MateMágico Champions

**Last Update**: 2026-10-13
**Phase**: Prompt 10 hardening implemented and locally validated. v0.2.0-mvp is not tagged; remote CI and real staging evidence remain release gates.

## Stack

npm workspaces + Turborepo, TypeScript, Vitest (unit/integration), Playwright (e2e), PostgreSQL 16 + Prisma, Node 22. Not pnpm, not Jest.

## Module status

| Module / Area         | Status                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                  | Implemented (domain, services, Prisma adapters, HTTP routes)                                                                                                                      |
| Membership            | Implemented (incl. School Context, Roles/Grants, Prisma adapters, routes)                                                                                                         |
| API (`apps/api`)      | Secure: Session -> Actor (Bearer), `/auth/{register,login,logout,me}`, `/memberships*`, `/schools*`, `/openapi.json`, CORS via `CORS_ALLOWED_ORIGINS`                             |
| Users, Schools        | Implemented (`@matemagico/users`, `@matemagico/schools`, Prisma adapters)                                                                                                         |
| Topics, Questions     | Implemented (`@matemagico/topics`, `@matemagico/questions`): versioned bank, filters, JSON/CSV import, 100 MOCK questions seeded, `/topics*` and `/questions*` routes (Prompt 04) |
| Question Engine       | Implemented (`@matemagico/question-engine`): published/current-only filtering, stable seeded selection, no duplicates, insufficient pool fails (Prompt 05)                        |
| Mock Exams            | Implemented (`@matemagico/mock-exams`): Prisma Exam/ExamQuestion, frozen question versions, DRAFT/PUBLISHED/ARCHIVED lifecycle, authorization-only StartExam (Prompt 05)          |
| Attempts, AutoCorrect | Implemented: frozen exam questions, answer persistence, automatic grading, completion event, history and review                                                                   |
| Rankings              | Implemented: idempotent `AttemptCompleted` projection, school/exam ordering and performance aggregations                                                                          |
| Web (`apps/web`)      | Implemented: student journey plus staff membership, exam, ranking and performance pages                                                                                           |
| Audit                 | `@matemagico/audit` persists AuditEvent records; Auth, Membership, Exams, Attempts and privacy operations are audited; DB test passes                                             |
| Operations            | Structured logs, request IDs, HTTP/Prometheus metrics, persistent login limiter, in-memory permission cache, privacy endpoints and readiness are wired; local CI gates pass       |

## Real ports (Prompt 02)

Job `quality` runs PostgreSQL 16 service with health check, `db:validate`, `db:generate`, `prisma migrate deploy`, `seed`, `test:db`, `test:contract`, format, lint, `test`, build, architecture check. Prisma tests run because `TEST_DATABASE_URL` is set.

## Session -> Actor (Prompt 03)

The Actor is derived only from the Session (`Authorization: Bearer <sessionId>`) by `GetSessionActor`. No route accepts `actorUserId` (strict Zod bodies, query strings rejected). Authentication middleware -> 401 (AUTH-003); authorization middleware/services -> 403 (SC-00x, MEM-005). Membership uses `canActivateMembership` / `canGrantRole`; `POST /schools` makes the creator SCHOOL_ADMIN. OpenAPI: `docs/api/openapi.json` (`npm run openapi -w @matemagico/api`). Tests (local, with PostgreSQL): API 41 (20 need a database), Membership 155 + DB suites.

## Topics + Questions (Prompt 04)

### Editorial pipeline (Prompt 04.1)

XLSX uploads use `POST /questions/import/xlsx` and always create `IMPORTED` questions. The supplied
640-row workbook was processed in memory: 524 created, 116 duplicates, zero errors, zero published;
it was not loaded into the persistent database because OBMEP licensing is not approved. The editorial
cycle is `IMPORTED -> IN_REVIEW -> APPROVED -> PUBLISHED`; publication validates provenance,
explanation, topic, official level, options, and image state. Published content remains immutable;
version N+1 restarts as `IMPORTED`. Editorial queue and dashboard APIs are available. The database
remains a global bank, and `schoolId` is authorization context rather than content ownership.
See `docs/questions/EDITORIAL-PIPELINE.md`. OBMEP content remains unauthorized per ADR-0011.

Questions are rows `(questionId, version)` (`isCurrent` marks the latest). Published versions are immutable; changes create version N+1 as DRAFT and publishing it archives the previous published version (partial unique indexes enforce one current and one published per question). Writes need `question:create|update|publish` in the `schoolId` of the request (TEACHER/SCHOOL_ADMIN only). Readers see only PUBLISHED questions/ACTIVE topics without `isCorrect`. Content is MOCK only (ADR-0011); import format in `docs/questions/IMPORT-FORMAT.md`. Tests: topics 13, questions 20 (+1 DB each), API e2e 51 (30 need a database, 10 are new); coverage topics ~96%, questions ~95%.

## Question Engine + Mock Exams (Prompt 05)

`GenerateQuestionSet` takes level, topic, quantity, and seed; eligible rows must be PUBLISHED and `isCurrent`, selected once each in a stable seeded order. Quantity > available produces `QEN-001`. `MockExam` persists `(examId, questionId, questionVersion, position)` and validates positive duration, valid availability window, unique questions, and publication lifecycle. Published exams have no content edit route; the schedule and question references are retained. `StartExam` checks PUBLISHED + current availability window and returns question options without `isCorrect`; it does not create an Attempt. Teacher/admin permissions: `exam:create`, `exam:publish`; student read/start: `school:read`. DB checks enforce positive duration and valid dates; the migration also has the foreign key to the exact question version.

## Attempts + Student Journey (Prompts 06-08)

Attempts persist answers against frozen exam question versions, calculate results on completion, and produce a validated `AttemptCompleted` event for eventual outbox dispatch. Students can list and start available exams, answer and finish attempts, view results, and browse history/review. Completion is stored as `SUBMITTED`; only completed attempts are projected to rankings.

## Teacher/School Journey + Rankings (Prompt 09)

School administrators can list members, activate memberships, and grant roles. Teachers and school administrators can create and edit DRAFT exams, then publish them immutably. Staff pages show school/exam rankings and per-student/per-topic performance. `@matemagico/rankings` projects `AttemptCompleted` idempotently by `attemptId`, applies score/correct-answer/time/completion ordering, and exposes `GET /rankings/school`, `GET /rankings/exams/:examId`, and `GET /performance/school`. OpenAPI is generated at `docs/api/openapi.json`.

## Tests

Prompt 10 local validation (2026-10-13): `npm test` passed 456 tests (88 DB-gated tests skipped); `npm run test:db` passed 102 tests; Playwright passed 6/6. Lint and build passed in all 21 workspaces; architecture passed (739 modules, 1,078 dependencies); format check passed; Prisma schema validated; OpenAPI generation was idempotent. Local Docker staging migration, readiness, Web login and smoke flow passed in the preceding validation run. The GitHub Actions workflow and real staging environment have not been independently run.

## Prompt 10 current implementation

- Audit events are wired for login/logout, Membership activation/Role grant, exam create/update/publish/archive, attempt finish, self-export and deactivation. The Prisma DB test passes in the DB runner.
- HTTP logs use JSON context; `X-Request-Id`/`X-Correlation-Id`, security headers, Prometheus metrics and readiness checks are present.
- Login throttling defaults to PostgreSQL hashed counters; permission decisions use a 15-second in-memory cache with local invalidation.
- `GET /me/export` and `POST /me/deactivate` have OpenAPI contracts. Docker staging and `scripts/smoke-test.mjs` passed locally; a real staging deployment remains unverified.
- Known limitation: permission-cache invalidation is process-local; do not scale API replicas without shared invalidation. Request IDs provide correlation, not distributed tracing spans.

## Governance

- Frontend decision: ADR-0005 ACTIVE; ADR-0006/0007/0008/0010 Superseded. See `docs/architecture/ADRs/ADR-INDEX.md`.
- ADR-0001–0005 and 0009 remain `Proposed` (formal approval pending, not a P0).
- MVP scope: `docs/product/MVP-SCOPE.md`.
- No open P0 blockers for Prompts 02 and 03.

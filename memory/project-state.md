# Project State - MateMágico Champions

**Last Update**: 2026-10-10
**Phase**: Prompt 05 (Question Engine + Mock Exams) complete; next is Prompt 06 (Attempts + AutoCorrect + Outbox + Ranking Base)

## Stack

npm workspaces + Turborepo, TypeScript, Vitest (unit/integration), Playwright (e2e), PostgreSQL 16 + Prisma, Node 22. Not pnpm, not Jest.

## Module status

| Module / Area                  | Status                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                           | Implemented (domain, services, Prisma adapters, HTTP routes)                                                                                                                      |
| Membership                     | Implemented (incl. School Context, Roles/Grants, Prisma adapters, routes)                                                                                                         |
| API (`apps/api`)               | Secure: Session -> Actor (Bearer), `/auth/{register,login,logout,me}`, `/memberships*`, `/schools*`, `/openapi.json`, CORS via `CORS_ALLOWED_ORIGINS`                             |
| Users, Schools                 | Implemented (`@matemagico/users`, `@matemagico/schools`, Prisma adapters)                                                                                                         |
| Topics, Questions              | Implemented (`@matemagico/topics`, `@matemagico/questions`): versioned bank, filters, JSON/CSV import, 100 MOCK questions seeded, `/topics*` and `/questions*` routes (Prompt 04) |
| Question Engine                | Implemented (`@matemagico/question-engine`): published/current-only filtering, stable seeded selection, no duplicates, insufficient pool fails (Prompt 05)                        |
| Mock Exams                     | Implemented (`@matemagico/mock-exams`): Prisma Exam/ExamQuestion, frozen question versions, DRAFT/PUBLISHED/ARCHIVED lifecycle, authorization-only StartExam (Prompt 05)          |
| Attempts, AutoCorrect, Ranking | Not started (Prompt 06+)                                                                                                                                                          |
| Web (`apps/web`)               | Scaffold only; out of MVP baseline                                                                                                                                                |

## Real ports (Prompt 02)

Job `quality` runs PostgreSQL 16 service with health check, `db:validate`, `db:generate`, `prisma migrate deploy`, `seed`, `test:db`, `test:contract`, format, lint, `test`, build, architecture check. Prisma tests run because `TEST_DATABASE_URL` is set.

## Session -> Actor (Prompt 03)

The Actor is derived only from the Session (`Authorization: Bearer <sessionId>`) by `GetSessionActor`. No route accepts `actorUserId` (strict Zod bodies, query strings rejected). Authentication middleware -> 401 (AUTH-003); authorization middleware/services -> 403 (SC-00x, MEM-005). Membership uses `canActivateMembership` / `canGrantRole`; `POST /schools` makes the creator SCHOOL_ADMIN. OpenAPI: `docs/api/openapi.json` (`npm run openapi -w @matemagico/api`). Tests (local, with PostgreSQL): API 41 (20 need a database), Membership 155 + DB suites.

## Topics + Questions (Prompt 04)

Questions are rows `(questionId, version)` (`isCurrent` marks the latest). Published versions are immutable; changes create version N+1 as DRAFT and publishing it archives the previous published version (partial unique indexes enforce one current and one published per question). Writes need `question:create|update|publish` in the `schoolId` of the request (TEACHER/SCHOOL_ADMIN only). Readers see only PUBLISHED questions/ACTIVE topics without `isCorrect`. Content is MOCK only (ADR-0011); import format in `docs/questions/IMPORT-FORMAT.md`. Tests: topics 13, questions 20 (+1 DB each), API e2e 51 (30 need a database, 10 are new); coverage topics ~96%, questions ~95%.

## Question Engine + Mock Exams (Prompt 05)

`GenerateQuestionSet` takes level, topic, quantity, and seed; eligible rows must be PUBLISHED and `isCurrent`, selected once each in a stable seeded order. Quantity > available produces `QEN-001`. `MockExam` persists `(examId, questionId, questionVersion, position)` and validates positive duration, valid availability window, unique questions, and publication lifecycle. Published exams have no content edit route; the schedule and question references are retained. `StartExam` checks PUBLISHED + current availability window and returns question options without `isCorrect`; it does not create an Attempt. Teacher/admin permissions: `exam:create`, `exam:publish`; student read/start: `school:read`. DB checks enforce positive duration and valid dates; the migration also has the foreign key to the exact question version.

## Tests

Without database, some Prisma suites are skipped. With `TEST_DATABASE_URL` (`npm run test:db`), `npm run test` runs everything with 0 skipped in Membership: users 19, schools 20, auth 77, membership 171, API e2e 52 (Prompt 02, local run).

## Governance

- Frontend decision: ADR-0005 ACTIVE; ADR-0006/0007/0008/0010 Superseded. See `docs/architecture/ADRs/ADR-INDEX.md`.
- ADR-0001–0005 and 0009 remain `Proposed` (formal approval pending, not a P0).
- MVP scope: `docs/product/MVP-SCOPE.md`.
- No open P0 blockers for Prompts 02 and 03.

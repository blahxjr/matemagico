# Technical Debt - MateMágico Champions

**Last Updated**: 2026-10-10. Canonical register: [TECH-DEBT.md](../TECH-DEBT.md).

| Item                                                                                                                                                                                     | Priority  | Status                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------- |
| CI without PostgreSQL / skipped tests                                                                                                                                                    | High      | Resolved in Prompt 01     |
| ActorAuthorizer, UserDirectory, SchoolDirectory real implementations                                                                                                                     | High (P1) | Resolved in Prompt 02     |
| CreateSchool gating; granular authorizer checks (canGrantRole/canActivateMembership)                                                                                                     | High (P1) | Resolved in Prompt 03     |
| Registration endpoint / password reset                                                                                                                                                   | Medium    | Register done; reset open |
| API layer                                                                                                                                                                                | Medium    | Resolved (Prompt 03)      |
| Rate limiter is in-memory (adapter swappable, none persistent yet)                                                                                                                       | Medium    | Open                      |
| Unlimited school creation per user; Bearer-only sessions (no refresh/CSRF)                                                                                                               | Medium    | Open                      |
| Privileged-role second approval not exposed in API                                                                                                                                       | Medium    | Open                      |
| Outbox pattern (incl. UserRegistered, SchoolCreated)                                                                                                                                     | Medium    | Open                      |
| Observability (metrics, tracing)                                                                                                                                                         | Medium    | Partial (structured logs) |
| Audit trail                                                                                                                                                                              | Medium    | Open                      |
| Question bank content is MOCK only (ADR-0011); OBMEP authorization pending                                                                                                               | High      | Open                      |
| Question authorship tied to a school context; bank is global                                                                                                                             | Medium    | Open                      |
| Import is CLI only (no HTTP endpoint)                                                                                                                                                    | Low       | Open                      |
| Attempts, AutoCorrect, and Ranking Base are not implemented yet                                                                                                                          | Planned   | Prompt 06                 |
| Exam publish verifies each frozen question version was published (`publishedAt`), even if a newer version archived it; concurrent publication transactions are not explicitly serialized | Low       | Monitor                   |
| ADR formal approval                                                                                                                                                                      | Medium    | Open                      |

No open P0 items.

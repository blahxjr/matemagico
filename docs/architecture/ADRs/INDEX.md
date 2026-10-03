# Architectural Decision Records

**Last reviewed**: 2026-09-29  
**Status**: Index of documented decisions; Proposed does not mean approved.

## Normative Baseline

| ADR      | Decision                                                 | Status                                                                                                    | Canonical document                                                                                                                                   | Depends on                           |
| -------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| ADR-0001 | Architecture Foundation                                  | Accepted in the embedded header; stakeholder approval is still recorded as pending and must be reconciled | `ARCHITECTURE.md`, section 6                                                                                                                         | Product vision and stack constraints |
| ADR-0002 | Module Boundaries and Domain Communication               | Proposed                                                                                                  | [ADR-0002-module-boundaries.md](ADR-0002-module-boundaries.md)                                                                                       | ADR-0001                             |
| ADR-0003 | Database Strategy and Domain Data Model                  | Proposed                                                                                                  | [ADR-0003-database-strategy.md](ADR-0003-database-strategy.md)                                                                                       | ADR-0001, ADR-0002                   |
| ADR-0004 | Authentication and Authorization                         | Proposed                                                                                                  | [ADR-0004-authentication-authorization.md](ADR-0004-authentication-authorization.md)                                                                 | ADR-0002, ADR-0003                   |
| ADR-0005 | Frontend Architecture, State Management and BFF Strategy | Proposed; canonical proposal for frontend state/BFF                                                       | [ADR-0005-frontend-architecture-state-management-bff.md](ADR-0005-frontend-architecture-state-management-bff.md)                                     | ADR-0002, ADR-0003, ADR-0004         |
| ADR-0009 | Analytics, Telemetry and Educational Insights            | Proposed                                                                                                  | [ADR-0009 - Analytics, Telemetry and Educational Insights Strategy](ADR-0009%20-%20Analytics,%20Telemetry%20and%20Educational%20Insights%20Strategy) | ADR-0002, ADR-0003, ADR-0004         |
| ADR-0010 | Frontend Architecture and UI Composition                 | Proposed; composition/design-system scope only; state follows ADR-0005                                    | [ADR-0010 - Frontend Architecture and UI Composition Strategy.md](ADR-0010%20-%20Frontend%20Architecture%20and%20UI%20Composition%20Strategy.md)     | ADR-0005 and product UI requirements |

## Superseded Proposals

These files are retained as decision history. They are not current normative guidance.

| ADR                            | Historical scope                                 | Status     | Superseded by                                  |
| ------------------------------ | ------------------------------------------------ | ---------- | ---------------------------------------------- |
| ADR-0005 (state-only proposal) | State Management Strategy                        | Superseded | ADR-0005 canonical frontend/state/BFF proposal |
| ADR-0006                       | Frontend Architecture and UI State Management    | Superseded | ADR-0005 and ADR-0010 composition scope        |
| ADR-0007                       | Frontend State Management Strategy               | Superseded | ADR-0005                                       |
| ADR-0008                       | Frontend Architecture, UI State and BFF Strategy | Superseded | ADR-0005                                       |

Canonical ADR-0005: [ADR-0005-frontend-architecture-state-management-bff.md](ADR-0005-frontend-architecture-state-management-bff.md). Historical state-only ADR-0005: [ADR-0005-state-management-strategy.md](ADR-0005-state-management-strategy.md).

## Governance and Open Decisions

- All ADRs except the embedded ADR-0001 are currently Proposed or Superseded; no approval checklists are recorded as completed.
- ADR-0001 status/sign-off must be reconciled with the stakeholder-review blocker in project memory.
- ADR-0006–ADR-0008 are superseded proposals; do not create new decisions under their numbers without first resolving numbering and lifecycle in a review.
- The analytics file currently has no `.md` suffix. Its content is linked above by its actual filename; normalize the filename only through a reviewed rename so links are updated together.
- Remaining cross-cutting topics (privacy/LGPD for minors, event contract governance, operational SLO/DR, architecture fitness testing and pedagogy/competition engine rules) are open decisions. Assign new ADR numbers only after stakeholders approve this roadmap and confirm sequence.
- [ADR-DIAGNOSTIC-REPORT.md](ADR-DIAGNOSTIC-REPORT.md) records the latest audit findings and correction priorities.
- [ADR-TEMPLATE.md](ADR-TEMPLATE.md) is the required template for future decisions.

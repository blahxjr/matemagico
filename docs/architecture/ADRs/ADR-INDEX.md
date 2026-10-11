# Architectural Decision Records

**Last reviewed**: 2026-10-09
**Status**: Canonical repository index. `Proposed` is not approval; see the approval note below.

This index is the single inventory of ADRs, their current scope, canonical files, dependencies, and supersession. The [V1 architectural baseline](V1-ARCHITECTURAL-BASELINE.md) consolidates the current proposal without replacing the detailed ADRs.

## Current V1 baseline

“Current” or “active” means the document is the selected reference for its scope in the proposed V1 baseline. It does **not** mean `Accepted`. No approval status is inferred from this index.

| ADR      | Decision                                        | Recorded status and current scope                                           | Canonical document                                                                                                                                   | Depends on                           |
| -------- | ----------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| ADR-0001 | Architecture Foundation                         | Proposed; approval pending; canonical standalone record                     | [ADR-0001-base-architecture.md](ADR-0001-base-architecture.md)                                                                                       | Product vision and stack constraints |
| ADR-0002 | Module Boundaries and Domain Communication      | Proposed; current V1 reference                                              | [ADR-0002-module-boundaries.md](ADR-0002-module-boundaries.md)                                                                                       | ADR-0001                             |
| ADR-0003 | Database Strategy and Domain Data Model         | Proposed; current V1 reference                                              | [ADR-0003-database-strategy.md](ADR-0003-database-strategy.md)                                                                                       | ADR-0001, ADR-0002                   |
| ADR-0004 | Authentication and Authorization                | Proposed; current V1 reference                                              | [ADR-0004-authentication-authorization.md](ADR-0004-authentication-authorization.md)                                                                 | ADR-0002, ADR-0003                   |
| ADR-0005 | Frontend Architecture, State Management and BFF | Proposed; canonical current proposal for frontend state/BFF                 | [ADR-0005-frontend-architecture-state-management-bff.md](ADR-0005-frontend-architecture-state-management-bff.md)                                     | ADR-0002, ADR-0003, ADR-0004         |
| ADR-0009 | Analytics, Telemetry and Educational Insights   | Proposed; current proposal, not re-reviewed in depth in this consolidation  | [ADR-0009 - Analytics, Telemetry and Educational Insights Strategy](ADR-0009%20-%20Analytics,%20Telemetry%20and%20Educational%20Insights%20Strategy) | ADR-0002, ADR-0003, ADR-0004         |
| ADR-0011 | Question Content Licensing Strategy             | Proposed; legal sign-off pending (only MOCK/original content is authorized) | [ADR-0011-question-content-licensing-strategy.md](ADR-0011-question-content-licensing-strategy.md)                                                   | ADR-0003, ADR-0004                   |

## Superseded proposals

These files are retained as history and are not current normative guidance.

| Record                         | Historical scope                                  | Status     | Superseded by                                  |
| ------------------------------ | ------------------------------------------------- | ---------- | ---------------------------------------------- |
| ADR-0005 (state-only proposal) | State Management Strategy                         | Superseded | Canonical ADR-0005 frontend/state/BFF proposal |
| ADR-0006                       | Frontend Architecture and UI State Management     | Superseded | ADR-0005                                       |
| ADR-0007                       | Frontend State Management Strategy                | Superseded | ADR-0005                                       |
| ADR-0008                       | Frontend Architecture, UI State and BFF Strategy  | Superseded | ADR-0005                                       |
| ADR-0010                       | Frontend Architecture and UI Composition Strategy | Superseded | ADR-0005 (composition covered in §2.9)         |

## Frontend decision status

```text
ACTIVE:     ADR-0005
SUPERSEDED: ADR-0006
SUPERSEDED: ADR-0007
SUPERSEDED: ADR-0008
SUPERSEDED: ADR-0010
```

The canonical ADR-0005 is [ADR-0005-frontend-architecture-state-management-bff.md](ADR-0005-frontend-architecture-state-management-bff.md). Its historical state-only predecessor is [ADR-0005-state-management-strategy.md](ADR-0005-state-management-strategy.md).

## Approval and open decisions

- ADR-0001 through ADR-0005 and ADR-0009 remain `Proposed`; their approval checklists/sign-offs are not recorded as complete.
- The embedded ADR-0001 in `ARCHITECTURE.md` is retained as historical source material; its `Accepted` header is not the current status. The standalone ADR-0001 above is canonical and remains `Proposed` pending explicit approval.
- ADR-GOVERNANCE is itself `Proposed`; this index is the repository's canonical inventory, not evidence that the proposed governance policy has been ratified.
- The ADR-0009 file currently has no `.md` suffix. Keep the link to its actual filename; normalize it only with a reviewed rename and corresponding link updates.
- Privacy/LGPD for minors, event contract governance, operational SLO/DR, architecture fitness testing, and pedagogical/competition rules remain open. Confirm numbering with stakeholders before adding new ADRs.
- [ADR-DIAGNOSTIC-REPORT.md](ADR-DIAGNOSTIC-REPORT.md) records a point-in-time audit; it is not a source of current decisions.
- [ADR-TEMPLATE.md](ADR-TEMPLATE.md) is the template for future decisions.

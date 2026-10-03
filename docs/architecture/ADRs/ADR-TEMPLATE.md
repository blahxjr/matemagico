# ADR [NUMBER] - [DECISION TITLE]

**Date**: YYYY-MM-DD  
**Status**: [Proposed | Accepted | Deprecated | Superseded]  
**Deciders**: [List of people who made this decision]  
**Affects**: [System components impacted]

---

## 1. Context

Describe the issue/problem that motivated this decision. Include:

- What is the situation?
- What are the constraints?
- What are the relevant requirements?
- What is the current state?

### Constraints

- Constraint 1
- Constraint 2

### Requirements

- Requirement 1
- Requirement 2

---

## 2. Decision

**DECISION STATEMENT**: [Short, clear statement of what is decided]

### Why This Choice

| Option       | Pros         | Cons         | Why Chosen?   |
| ------------ | ------------ | ------------ | ------------- |
| **Option A** | Pro 1, Pro 2 | Con 1, Con 2 | ✅ Selected   |
| **Option B** | Pro 1, Pro 2 | Con 1, Con 2 | ❌ Considered |
| **Option C** | Pro 1, Pro 2 | Con 1, Con 2 | ❌ Considered |

### Rationale

Explain why this decision is the best choice given the context and constraints.

---

## 3. Consequences

### ✅ Positive Consequences

1. Consequence 1 and why it's positive
2. Consequence 2 and why it's positive
3. Impact on team velocity, codebase health, etc.

### ⚠️ Negative Consequences

1. Challenge 1 and potential mitigation
2. Challenge 2 and potential mitigation
3. Trade-offs accepted

### 🔧 Trade-offs Accepted

| Trade-off             | Accept Because    | Monitor         |
| --------------------- | ----------------- | --------------- |
| Short-term complexity | Long-term benefit | Velocity impact |
| Vendor dependency     | Faster delivery   | Lock-in risk    |

---

## 4. Risks

### Risk Assessment

| ID  | Risk               | Severity        | Likelihood      | Mitigation              |
| --- | ------------------ | --------------- | --------------- | ----------------------- |
| R1  | [Risk description] | High/Medium/Low | High/Medium/Low | [How we prevent/handle] |
| R2  | [Risk description] | High/Medium/Low | High/Medium/Low | [How we prevent/handle] |

### Monitoring & Alerting

Define what signals indicate this decision is failing:

- Metric 1 > threshold → action X
- Metric 2 > threshold → action Y

---

## 5. Alternatives Considered

### Alternative A: [Name]

**Description**: [What it is]

**Pros**:

- Pro 1
- Pro 2

**Cons**:

- Con 1
- Con 2

**Why not chosen**: [Clear reason]

---

### Alternative B: [Name]

**Description**: [What it is]

**Pros**:

- Pro 1
- Pro 2

**Cons**:

- Con 1
- Con 2

**Why not chosen**: [Clear reason]

---

## 6. Implementation

### Timeline

- Week 1: [Phase 1]
- Week 2: [Phase 2]
- Week 3: [Phase 3]

### Affected Components

- Component A (why it changes)
- Component B (why it changes)

### Migration Plan (if applicable)

- Step 1
- Step 2
- Rollback procedure

### Effort Estimation

- Frontend changes: X days
- Backend changes: Y days
- Testing: Z days
- **Total**: X+Y+Z days

### Observability Baseline

All ADRs that affect runtime behavior must identify how the decision is observed and adopt the common platform baseline:

- **OpenTelemetry** is the instrumentation and propagation standard for traces, metrics, and context. It does not by itself select or authorize a vendor/backend.
- **Correlation ID** is created or accepted at the trusted ingress and propagated through application contracts, events (`correlationId`/`causationId`), jobs, logs, and traces. Never trust client-supplied IDs as identity or authorization.
- **Structured Logging** uses structured fields (JSON at runtime), timestamp, environment, service/module, operation, outcome, duration, trace/correlation IDs, and `schoolId` only where approved. Secrets, credentials, tokens, answers, and unnecessary PII are redacted.
- **Error Tracking** captures uncaught failures and correlation/trace references. Vendor selection remains governed by the project stack; this baseline does not add a new tool. Scrub PII/secrets before export.
- **Metrics** cover request/action latency and errors, throughput, database/cache/queue health, projection lag, and business metrics with explicit owner/denominator. Avoid high-cardinality labels such as raw user IDs or unrestricted school IDs.
- **Tracing** spans ingress, application use case, module contract, repository/external adapter, and event consumer; propagate trace context across asynchronous boundaries without placing sensitive payloads in spans.

Responsibility follows Clean Architecture: domain/application emit vendor-neutral outcomes/telemetry through ports; infrastructure provides OpenTelemetry adapters/exporters; `apps/web` instruments route/action boundaries; each module owns its operational and business metrics. Observability must not become a cross-module data-ownership bypass.

### Standard Test Matrix

Every ADR affecting implementation must use this common matrix. Add scenario-specific tests in the ADR; do not omit a level without documenting why it is not applicable.

| Test level        | Primary responsibility                                                   | Required evidence                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit Tests        | Domain and application owners; frontend feature owners for pure UI logic | Invariants, policies, validation/mapping, selectors, error behavior; isolated from infrastructure where possible.                                 |
| Integration Tests | Module/application and infrastructure owners                             | Contracts with repositories, PostgreSQL/Prisma, Auth.js adapters, cache invalidation, transaction/outbox and authorization boundaries.            |
| Contract Tests    | Provider and consumer owners jointly                                     | Public module contracts, event schemas/version compatibility, DTOs and BFF/action inputs/outputs; consumer cannot rely on private implementation. |
| E2E Tests         | Product journey/frontend owner with module owners                        | Critical user journeys across auth, school scope, forms, learning/competition, error/loading and accessibility-critical behavior.                 |
| Load Tests        | Architecture/platform owners with domain owners                          | Representative workload, skewed tenant sizes, concurrency/hotspots, database pools, cache/event lag and SLO verification before scale claims.     |

Layer mapping: **Domain** primarily Unit; **Application** Unit + Contract; **Infrastructure** Integration + migration/adapter checks; **Frontend** Unit + E2E; **cross-module/event boundaries** Contract + Integration; **production scale claims** Load Tests. Security/tenant negative cases are mandatory across Integration and E2E where applicable.

---

## 7. Related ADRs

Link to related decisions:

- [[ADR-000X]] - Related topic
- [[ADR-000Y]] - Related topic

---

## 8. References & Research

- Link to discussion
- Reference document
- Related article

---

## 9. Sign-Off

Decision approved by:

- [ ] Architecture Lead
- [ ] Tech Lead
- [ ] Product Manager
- [ ] CTO

---

## 10. Future Reconsideration

This decision should be revisited if:

- [Condition 1 changes]
- [Condition 2 changes]
- [Performance metric falls below X]

**Review Date**: [Date to check back]

---

**Template Version**: 1.0  
**Based on**: Nygard ADR Format

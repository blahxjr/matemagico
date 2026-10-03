# Technical Debt - MateMágico Champions

**Document Type**: Tech Debt Tracking  
**Last Updated**: 2026-09-29  
**Version**: 1.0  
**Purpose**: Track design debt and deferred decisions

---

## Active Tech Debt Items

### T001: Error Handling Standardization

**Status**: Design Phase  
**Severity**: Medium  
**Created**: 2026-09-29  
**Related**: ADR-0006 (Planned)

**Description**:
Need consistent error handling pattern across application. Current approach (during design phase) has various ways to handle errors:

- Exceptions (to avoid)
- null values (to avoid)
- Result<T> type (preferred pattern)
- HTTP status codes (for APIs)

**Impact**:

- Unclear error contracts between modules
- Difficult debugging
- Inconsistent error messages to users

**Planned Fix**:

- Create ADR-0006 with error handling strategy
- Implement Result<T> pattern
- Wrap Prisma errors
- Standardize error codes

**Estimate**: 3-5 days (implementation) + 2 days (refactor existing)  
**Owner**: Tech Lead  
**Timeline**: Q4 2026 (post-MVP)

---

### T002: Monitoring & Observability

**Status**: Not Started  
**Severity**: High  
**Created**: 2026-09-29

**Description**:
No centralized logging, monitoring, or alerting infrastructure planned yet. Critical for production but not needed for MVP.

**Impact**:

- Difficult to debug production issues
- No performance visibility
- Can't track user flows
- No alert for critical failures

**Planned Solution**:

- Winston for application logging
- Sentry for error tracking
- Prometheus for metrics (future)
- Grafana for dashboards (future)

**Estimate**: 5-7 days (full setup)  
**Owner**: DevOps  
**Timeline**: Before first production deployment

---

### T003: Testing Infrastructure

**Status**: Not Started  
**Severity**: High  
**Created**: 2026-09-29

**Description**:
Test structure not yet implemented. Need:

- Jest configuration
- Testing Library setup
- Playwright E2E setup
- Fixtures and test data strategy

**Impact**:

- Cannot verify code quality
- Risk of regressions
- Difficult onboarding of new devs

**Planned Solution**:

- Jest + Testing Library for unit/integration
- Playwright for E2E
- Test fixtures for common scenarios
- CI integration

**Estimate**: 7-10 days (full setup)  
**Owner**: Tech Lead  
**Timeline**: Week 2 of implementation

---

### T004: Database Schema Optimization

**Status**: Planned  
**Severity**: Medium  
**Created**: 2026-09-29

**Description**:
Before MVP, need to:

- Validate schema against use cases
- Add appropriate indexes
- Plan for soft deletes
- Design audit trail structure

**Impact**:

- Performance issues at scale
- Data integrity problems
- Difficult migrations

**Planned Solution**:

- Entity relationship diagrams
- Query performance analysis
- Index strategy documentation
- Migration testing procedure

**Estimate**: 5 days  
**Owner**: Backend Lead  
**Timeline**: Before first code commit

---

### T005: Real-time Features Design

**Status**: Research  
**Severity**: Low  
**Created**: 2026-09-29

**Description**:
Not designed yet: how will rankings update in real-time? Options:

- WebSockets (complex, but real-time)
- Server-Sent Events (simpler)
- Polling (simplest, least elegant)

**Impact**:

- User experience (lag in rankings/badges)
- Infrastructure complexity (deferred)

**Planned Solution**:

- MVP: Simple polling (5 min cache + manual refresh)
- Phase 2: SSE for updates
- Phase 3+: WebSockets if needed

**Estimate**: Research (1 day), Implementation (3-5 days)  
**Owner**: Tech Lead  
**Timeline**: Post-MVP

---

### T006: IA Integration Points

**Status**: Design Phase  
**Severity**: Low  
**Created**: 2026-09-29

**Description**:
Product roadmap mentions "IA educacional" (future) but no integration points designed. Need to identify:

- Where IA will hook into (study path generation, question recommendations)
- API contracts for IA services
- Data structure for IA metadata

**Impact**:

- May need schema changes later (breaking migration)
- IA team can't start parallel work

**Planned Solution**:

- Design AI integration points (Phase 3)
- Create service contracts
- Test with mock IA service

**Estimate**: 5-7 days (design)  
**Owner**: Architecture  
**Timeline**: Month 2 (before Phase 2)

---

### T007: Backup & Disaster Recovery

**Status**: Not Started  
**Severity**: High  
**Created**: 2026-09-29

**Description**:
Need to design:

- Database backup strategy (automated, tested)
- Recovery point objective (RPO)
- Recovery time objective (RTO)
- Data retention policy

**Impact**:

- Cannot recover from data loss
- GDPR compliance (retention)
- Regulatory issues

**Planned Solution**:

- Daily automated backups to S3
- Weekly restore testing
- 30-day retention policy
- RTO: 4 hours, RPO: 1 hour

**Estimate**: 3-5 days (setup)  
**Owner**: DevOps  
**Timeline**: Before production launch

---

### T008: PDF & Certificate Generation

**Status**: Library Selected  
**Severity**: Medium  
**Created**: 2026-09-29

**Description**:
Need to implement certificate generation. Selected pdfkit + html-pdf-node, but:

- Layout testing needed
- Font handling (Portuguese chars)
- Signature/seal verification (future)

**Impact**:

- Certificates look poor
- Encoding issues with special chars
- Difficult to prevent fraud

**Planned Solution**:

- Test with real Brazilian names
- Design template system
- Plan for digital signatures (post-MVP)

**Estimate**: 3-4 days (basic), 2 days (advanced)  
**Owner**: Frontend Lead  
**Timeline**: Phase 2

---

## Deferred Architectural Decisions

### D001: Microservices Extraction

**Decision**: Deferred until 50K+ users  
**Rationale**: Modular monolith scales to this point without issue  
**Trigger**: Performance issues at 50K+ or team scaling needs

### D002: Real-time Architecture

**Decision**: Start with polling, evolve to SSE/WebSockets  
**Rationale**: Polling good enough for MVP, polling simpler to deploy  
**Trigger**: User complaints about ranking lag

### D003: Analytics Warehouse

**Decision**: Start with direct queries, separate warehouse at 50K+  
**Rationale**: Analytics queries won't significantly impact OLTP at MVP scale  
**Trigger**: Query latency > 500ms during peak hours

### D004: Full-Text Search

**Decision**: PostgreSQL full-text search initially  
**Rationale**: Sufficient for MVP, can switch to Elasticsearch later  
**Trigger**: Search latency > 200ms or need for advanced features

### D005: File Upload Strategy

**Decision**: Supabase Storage (S3-compatible)  
**Alternative**: Direct S3 or Firebase Storage  
**Rationale**: Easier integration, no additional vendor lock-in  
**Review If**: Cost becomes issue or need multi-region support

---

## Deferred Infrastructure

### Caching Layer

**Status**: Planned for Phase 2  
**What**: Redis instance  
**Why Deferred**: MVP can use in-memory + Vercel edge cache  
**When**: After MVP when rankings become hot path

### Job Queue

**Status**: Planned for Phase 2  
**What**: Bull on Railway  
**Why Deferred**: MVP doesn't need async processing  
**When**: Need to send bulk emails, generate reports

### Analytics Database

**Status**: Planned for Phase 3  
**What**: Separate Neon PostgreSQL (read replica)  
**Why Deferred**: Analytics queries minimal in MVP  
**When**: At 50K+ users with multiple dashboards

### Observability Stack

**Status**: Planned for Phase 1.5 (pre-production)  
**What**: Winston, Sentry, Prometheus, Grafana  
**Why Deferred**: Not needed for dev/test  
**When**: Before production launch

---

## Code Quality Debt

### C001: Type Coverage

**Status**: Deferred (pre-MVP)  
**Target**: 95% type safety  
**Plan**: Enable `strict: true` in tsconfig.json gradually

### C002: Testing Coverage

**Status**: Deferred (post-MVP)  
**Target**: 70% statements, 80% critical paths  
**Plan**: Add tests per module incrementally

### C003: Documentation

**Status**: Partial (architecture done, code docs pending)  
**Target**: 80% of functions documented  
**Plan**: Add JSDoc during implementation

### C004: Linting & Formatting

**Status**: Not configured  
**Plan**: ESLint + Prettier on first setup

---

## Prioritized Payoff Schedule

| Debt                 | Effort | Value  | When        | Owner     |
| -------------------- | ------ | ------ | ----------- | --------- |
| T007: Backups        | Medium | High   | Before prod | DevOps    |
| T002: Monitoring     | High   | High   | Before prod | DevOps    |
| T003: Testing        | High   | High   | Phase 1     | Tech Lead |
| T001: Error handling | Medium | Medium | Phase 2     | Tech Lead |
| T004: DB optimize    | Medium | Medium | Phase 1     | Backend   |
| T002: Observable     | Medium | Medium | Phase 2     | DevOps    |
| T006: AI integration | Medium | Low    | Phase 3     | Arch      |
| T005: Real-time      | Medium | Low    | Phase 2     | Tech Lead |

---

## Monitoring Progress

### Month 1 Targets

- [ ] Testing framework setup
- [ ] Monitoring infrastructure deployed
- [ ] Database schema validated
- [ ] Backup strategy implemented

### Month 2 Targets

- [ ] Error handling standardized
- [ ] Initial test coverage (40%)
- [ ] Performance baseline established
- [ ] CI/CD fully operational

### Month 3 Targets

- [ ] Test coverage 70%+
- [ ] No unhandled errors in logs
- [ ] Response times < 200ms p95
- [ ] All critical paths tested

---

## Notes

- Tech debt prioritized for business impact, not just engineering cleanliness
- "Pay now vs. pay later" decision: most debt is strategic delay, not negligence
- Revisit every month to track progress and update timelines
- Use this as negotiation tool with product (impact on velocity)

---

**Last Review**: 2026-09-29  
**Next Review**: 2026-10-29  
**Document Owner**: Tech Lead

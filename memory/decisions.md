# Key Decisions - MateMágico Champions

**Document Type**: Decision Index  
**Last Updated**: 2026-09-29  
**Version**: 1.0

---

## Strategic Decisions

### Architecture Pattern: Modular Monolith

**ADR**: [[ADR-0001]]  
**Date Decided**: 2026-09-29  
**Status**: Embedded Accepted header; stakeholder sign-off pending
**Decision**: Use Modular Monolith with DDD and Clean Architecture

| Aspect     | Decision                                             |
| ---------- | ---------------------------------------------------- |
| Why        | Scales 10K→100K without rewrite, keeps simplicity    |
| When       | Day 1                                                |
| Trade-off  | No microservices complexity, but requires discipline |
| Revisit If | Need < 200ms p99 latency with 100K+ users            |

---

### Tech Stack: Next.js 15 + Prisma + PostgreSQL

**Date Decided**: Pre-project (given constraint)  
**Status**: Fixed  
**Rationale**:

- Next.js: SSR + API routes + deployment on Vercel
- Prisma: Type-safe ORM with migrations
- PostgreSQL: Mature, scalable, full-text search

---

### Module Organization: Consolidated Bounded Contexts

**Date Decided**: 2026-09-29  
**Status**: Proposed; canonical registry in ADR-0002
**Modules**: Auth/Authorization, Users, Schools, Classes, Topics, Questions, Question Engine, Study Paths, Attempts, Mock Exams, Championships, Rankings, Badges, Certificates, Analytics; AI remains optional future capability. See ADR-0002 for ownership and contracts.

**Communication**: Public application contracts for synchronous calls; versioned events for side effects; no imports of another module's internals.

### Foundation Bootstrap

**Date**: 2026-09-29  
**Status**: Completed; implementation remains limited to technical foundation

**Decision**: Bootstrap the npm-workspaces monorepo, Next.js App Router, strict TypeScript, Prisma datasource without domain models, structured logger, shared contracts, Vitest, Playwright, quality hooks, dependency enforcement and CI skeleton.

**Boundary**: No Schools, Classes, Questions, Question Engine, Attempts, Rankings, Championships or Analytics implementation is included. Later stages must follow ADR-0002 ownership and the official `schoolId` strategy.

---

### Scalability Strategy: 3-Phase Growth

**Date Decided**: 2026-09-29  
**Status**: Proposed  
**Phases**:

| Phase  | Users | Duration | Key Changes                                 |
| ------ | ----- | -------- | ------------------------------------------- |
| MVP    | 10K   | M1-3     | Single server, in-memory cache              |
| Growth | 50K   | M4-9     | Redis cache, async jobs, index optimization |
| Scale  | 100K  | M10-18   | Microservices ready, OLAP separation        |

**No rewrite required at any phase** due to modular design.

---

## Naming Conventions Approved

| Type         | Convention                | Example                  |
| ------------ | ------------------------- | ------------------------ |
| Files        | kebab-case                | `user-profile.tsx`       |
| Folders      | kebab-case                | `modules/mock-exams/`    |
| Types        | PascalCase                | `UserProfile`            |
| Components   | PascalCase default export | `export default Button`  |
| Hooks        | use{Name}                 | `useAuth`, `use-form`    |
| Services     | {entity}.service.ts       | `user.service.ts`        |
| Repositories | {entity}.repository.ts    | `question.repository.ts` |

**Decision Rationale**: Clarity + consistency + searchability

---

## Stack Selections & Justifications

### UI Framework: shadcn/ui

**Why**: Component library built on Radix + Tailwind, highly customizable  
**Alternative Rejected**: Material-UI (heavier, less customizable)  
**Review Point**: If component library becomes limiting

### Forms: React Hook Form + Zod

**Why**:

- RHF: Performant, minimal dependencies, no unnecessary re-renders
- Zod: Type-safe validation, runtime checks, TypeScript inference

**Alternatives Rejected**:

- Formik (more verbose, slower)
- Yup (less modern than Zod)

### State Management: ADR-0005 canonical proposal

**Why**: RSC-first and server-owned domain state; React local state for forms/UI, Zustand only ephemeral feature UI state, TanStack Query opt-in for client-driven remote cache. Auth, permissions, memberships and official results remain server-owned.

**Alternative Rejected**: Redux (overkill for SaaS educational platform)

### Testing: Jest + Playwright

**Why**:

- Jest: Industry standard, fast, TypeScript support
- Playwright: Cross-browser E2E, no flakiness

**Alternatives Rejected**: Vitest (too new), Cypress (slower)

### Authentication: Auth.js (NextAuth.js)

**Why**: Session + JWT support, extensible, Vercel-friendly  
**Future Option**: OAuth providers integration

### Database: Prisma ORM

**Why**: Type-safe, automatic migrations, built-in seeding  
**Alternative Rejected**: Drizzle (newer, less ecosystem)

### Analytics: PostHog

**Why**: Event tracking + self-hosted option  
**Alternative Rejected**: Mixpanel (SaaS only, expensive for educational)

---

## Architectural Patterns

### Domain-Driven Design (DDD)

**Concepts Used**:

- Bounded Contexts (Auth, Users, Questions, etc)
- Ubiquitous Language (Questão, Simulado, Nível)
- Aggregates (Question + Answers, User + Profile)
- Value Objects (Score, Level, Email)
- Repositories (UserRepository, QuestionRepository)
- Domain Services (CorrectionService, RankingService)

**When to Use**: Whenever modeling complex business domains  
**When Not**: Simple CRUD endpoints

### Clean Architecture

**Layers**:

1. Entities (pure domain logic)
2. Use Cases (orchestration)
3. Interfaces (controllers, presenters)
4. Frameworks (React, Prisma, Next.js)

**Benefits**: Testability, independence, clarity

### Modular Monolith

**Principle**: Single deployment, multiple modules  
**Communication**: Only via types/contracts  
**Benefit**: Can extract microservices later

---

## Pending Decisions (Next ADRs)

| Topic               | ADR      | Status       | Deadline    |
| ------------------- | -------- | ------------ | ----------- |
| Module Boundaries   | ADR-0002 | Draft        | Next 3 days |
| Database Strategy   | ADR-0003 | Design phase | Next 5 days |
| Authentication Flow | ADR-0004 | Design phase | Next 5 days |
| State Management    | ADR-0005 | Research     | Next 7 days |
| Error Handling      | ADR-0006 | Proposed     | Post-MVP    |
| Real-time Updates   | ADR-0007 | Future       | Post-MVP    |

---

## Trade-offs Accepted

| Trade-off                 | What We Give Up        | What We Gain             | Why Worth It            |
| ------------------------- | ---------------------- | ------------------------ | ----------------------- |
| Monolith vs Microservices | Granular deployment    | Simplicity, code sharing | Early stage, small team |
| DDD complexity            | Ramp-up time           | Maintainability, clarity | Pays off at 50K+ LOC    |
| Next.js fullstack         | Separation of concerns | Unified deployment       | Vercel ready            |
| PostgreSQL + Prisma       | ORM limitations        | Type safety, migrations  | Dev velocity            |

---

## Revisit Triggers

| Decision         | Revisit If                                             |
| ---------------- | ------------------------------------------------------ |
| Modular Monolith | p99 latency > 300ms at 50K users                       |
| Prisma ORM       | Migration takes > 30 min or schema reaches 100+ tables |
| PostgreSQL       | Need < 100ms query at 100K concurrent users            |
| Auth.js          | Team needs enterprise features (SAML, etc)             |
| Zustand          | State becomes > 50KB                                   |
| PostHog          | Need real-time dashboards (switch to Grafana)          |

---

## Decision Velocity

| Month | Decisions                            | ADRs | Status         |
| ----- | ------------------------------------ | ---- | -------------- |
| Sept  | Architecture choice, Stack selection | 1    | ✅ Complete    |
| Oct   | Module boundaries, DB strategy       | 3-4  | 🟡 In progress |
| Nov   | Deployment strategy, Monitoring      | 5+   | 🔴 Queued      |
| Dec   | Performance optimization             | TBD  | 🔴 Future      |

---

## Notes

- All decisions documented in ARCHITECTURE.md main document
- ADR process established and template created
- Team alignment needed before proceeding with code
- Decisions favor simplicity + flexibility over early optimization

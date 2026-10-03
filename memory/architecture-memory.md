# Architecture Memory - MateMágico Champions

**Document Type**: Living Architecture Documentation  
**Last Updated**: 2026-09-29  
**Version**: 1.0  
**Purpose**: Preserve architectural decisions and patterns for future reference

---

## Core Architectural Principles

### 1. Simplicity First

Every architectural decision minimizes complexity.

- Prefer built-in solutions (Next.js Server Actions vs custom)
- Avoid premature optimization
- One solution per problem

### 2. Horizontal Scalability

Each module can scale independently without affecting others.

- Module autonomy
- Clear boundaries
- Async communication (future)

### 3. Module Autonomy

Each module owns its domain completely.

- Cannot be extracted without breaking others
- Can be understood in isolation
- Has clear contracts with other modules

### 4. Documentation as Code

Architecture documented alongside code.

- ADRs are living documents
- Code comments explain WHY not WHAT
- Memory system tracks decisions

### 5. Evolution Without Rewrite

Path to microservices exists without rewriting.

- Modular structure enables extraction
- Service boundaries already defined
- Migration can be gradual

---

## Architecture Overview

```
STACK:
┌─────────────────────────────────┐
│  Frontend: Next.js 15 + React   │
├─────────────────────────────────┤
│  Backend: Next.js Server Actions│
├─────────────────────────────────┤
│  Database: PostgreSQL + Prisma  │
├─────────────────────────────────┤
│  Auth: Auth.js (NextAuth.js)    │
├─────────────────────────────────┤
│  Storage: Supabase Storage      │
└─────────────────────────────────┘

PATTERN:
Modular Monolith + DDD + Clean Architecture

SCALE TARGETS:
Phase 1 (MVP):    10K users   - Single server
Phase 2 (Growth): 50K users   - Add cache, async
Phase 3 (Scale):  100K users  - Microservices ready
```

---

## Module Communication Strategy

### Within-Module Communication

```typescript
// ✅ OK: Direct imports within module
import { userRepository } from './repository';
import { UserService } from './services';

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    // ...
  },
};
```

### Cross-Module Communication

```typescript
// ❌ WRONG: Direct import from other module
import { UserService } from '@/modules/users/services';

// ✅ RIGHT: Use the public application contract
import { getUserProfile } from '@/modules/users/contracts';

// Even better: Pass data as parameter
async function processQuestion(
  questionId: string,
  createdBy: UserId, // Pass user data, don't fetch
) {
  // ...
}
```

### Boundary Rules

| Rule                                     | Reason                           |
| ---------------------------------------- | -------------------------------- |
| No imports of another module's internals | Avoid hidden coupling and cycles |
| Public application contracts             | Clear ownership and contracts    |
| Events for side effects                  | Loose coupling and replay        |
| No shared business Context/Store         | State isolation                  |
| Shared types only for stable contracts   | Prevent domain leakage           |

---

## Critical Paths (Dependencies)

### Initialization Path

```
Auth/Authorization (identity events) → Users (profile); Classes (enrollment) → Schools (institution context)
```

### Content Path

```
Topics (definition) → Questions (content) → StudyPaths (learning) → Attempts (practice)
```

### Evaluation Path

```
Attempts (outcomes) → Analytics/Rankings/Badges (event projections)
```

### Competition Path

```
Championships (event) → Brackets (structure) → Rankings (leaderboard) → Certificates (award)
```

### Circular Dependency Prevention

- Users consumes Auth identity events; Auth does not read Users internals ✅
- Membership access belongs to Auth/Authorization; class enrollment belongs to Classes ✅
- Questions depends on Topics ✅
- Topics does NOT depend on Questions ✅

---

## Layer Architecture Within Each Module

```
MODULE: Questions (Example)

┌──────────────────────────────────────┐
│  Presentation Layer (Components)     │
│  - QuestionCard.tsx                  │
│  - QuestionForm.tsx                  │
│  - QuestionViewer.tsx                │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  Application Layer (Use Cases)       │
│  - createQuestion() use case         │
│  - updateQuestion() use case         │
│  - evaluateAnswer() use case         │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  Domain Layer (Business Logic)       │
│  - Question entity                   │
│  - QuestionEvaluator service         │
│  - Answer value object               │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  Infrastructure (Data Access)        │
│  - QuestionRepository (Prisma)       │
│  - Search service                    │
│  - File upload (Supabase)            │
└──────────────────────────────────────┘
```

---

## Database Design Principles

### Schema Guidelines

- PascalCase for model names
- camelCase for field names
- Always include id (CUID) as primary key
- Always include createdAt, updatedAt
- Use soft deletes (deletedAt) where applicable
- Index all foreign keys
- Full-text search on searchable fields

### Migrations

- One migration = one logical concept
- Reversible migrations
- Timestamp in naming (YYYYMMDDHHMMSS)
- Tested against production volume

### Relationships

- One-to-many: Foreign key on "many" side
- Many-to-many: Junction table
- No circular dependencies
- Use relation names for clarity

### Performance Considerations

- Index before deploy to prod
- Analyze query plans
- Monitor slow queries
- Cache rankings (updated every 5 min)

---

## Error Handling Strategy

### Typed Errors (Planned for ADR-0006)

```typescript
// ✅ Future pattern
type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

type AppError =
  | { type: 'UNAUTHORIZED'; message: string }
  | { type: 'NOT_FOUND'; resource: string }
  | { type: 'VALIDATION_ERROR'; field: string; message: string }
  | { type: 'DATABASE_ERROR'; message: string };
```

### Error Propagation

- Components handle user-facing errors
- Services return Result type
- Controllers transform to HTTP responses

---

## Testing Strategy

### Coverage Targets

- Unit tests: 70% statements
- Integration tests: 50% user flows
- E2E tests: Critical paths only

### Test Organization

```
tests/
├── unit/
│   ├── modules/auth/
│   ├── modules/questions/
│   └── lib/
├── integration/
│   ├── auth-flow.test.ts
│   ├── question-submission.test.ts
│   └── ranking-calculation.test.ts
└── e2e/
    ├── student-signup.spec.ts
    ├── submit-exam.spec.ts
    └── view-ranking.spec.ts
```

### Mocking Strategy

- Mock external APIs (Supabase, Auth.js provider)
- Use real Prisma for integration tests
- Fixtures for test data

---

## Performance Budgets & Targets

### Phase 1 (MVP - 10K users)

- p95 latency: < 500ms
- First paint: < 3s
- Largest JS bundle: 100KB
- Database query: < 200ms

### Phase 2 (50K users)

- p95 latency: < 200ms
- First paint: < 2s
- Largest JS bundle: 80KB
- Database query: < 100ms

### Phase 3 (100K users)

- p95 latency: < 150ms
- First paint: < 1.5s
- Largest JS bundle: 60KB
- Database query: < 50ms

### Optimization Priorities

1. Database queries (biggest impact)
2. Bundle size (code splitting by module)
3. Cache strategy (Redis at phase 2)
4. Async processing (queues at phase 2)

---

## Deployment Architecture

### MVP Deployment

```
Git Push → GitHub Actions
       ↓
   Test + Build
       ↓
   Vercel Deploy (Web)
       ↓
   Neon Database (PostgreSQL)
       ↓
   Supabase Storage
```

### Phase 2+ Deployment

```
Same as MVP + :
- Redis Cache (Railway)
- Job Queue (Bull on Railway)
- Analytics Database (separate Neon)
```

### Disaster Recovery

- Database backups (automated)
- Code backups (GitHub)
- Secrets manager (Vercel env)
- Rollback procedure (git revert)

---

## Security Considerations

### Authentication

- Use Auth.js for session management
- JWT for API authentication (future)
- Never store passwords in cookies
- HTTPS enforced

### Authorization

- Role-based access control (RBAC)
- Check permissions in Use Cases layer
- Audit trails for admin actions

### Data Protection

- Sensitive fields encrypted at rest
- GDPR compliance (soft delete support)
- No logs of passwords/tokens
- Regular security audits

### Common Vulnerabilities Prevented

- XSS: React/Next.js built-in
- SQL Injection: Prisma parameterized queries
- CSRF: Next.js built-in
- Weak passwords: Zod validation + rules

---

## Monitoring & Observability

### Metrics to Collect

- Application metrics (request count, latency, errors)
- Database metrics (connection pool, slow queries)
- Business metrics (user signups, exam submissions)
- Infrastructure metrics (CPU, memory, disk)

### Logging Strategy

- Winston for structured logging
- Log levels: DEBUG, INFO, WARN, ERROR
- Centralized logs (Sentry for errors)

### Alerting

- Error rate > 1%: Page on-call
- Latency p99 > 1s: Email team
- Database connection pool > 80%: Investigate
- Disk usage > 80%: Alert

---

## Future Evolution Path

### When to Extract First Microservice

- Error rate stays high despite optimization
- Analytics module grows > 10K LOC
- Need independent scaling for reports
- Schema becomes too large to manage

### Microservices Order

1. Analytics (read-heavy, independent scaling)
2. Rankings (compute-heavy, can be async)
3. Championships (optional, event-driven)

### Without Full Rewrite

- Modular boundaries already defined
- Module index.ts is contract
- Can replace implementation gradually

---

## Architecture Decision Patterns

### When to Add Cache

- Query runs > 100ms
- Result doesn't change in real-time
- Cost of cache invalidation < cost of query

### When to Make Async

- Task takes > 1 second
- Not needed for response to user
- Can be retried safely

### When to Add Index

- Query uses WHERE clause on field
- Table has > 10K rows
- Query runs > 100ms

### When to Split Database

- Analytics queries affect OLTP performance
- Replication lag becomes issue
- Need different backup strategy

---

## Key Learnings & Assumptions

### Assumptions Made

1. **10K → 100K growth over 18 months**: Scalability plan based on this
2. **Educational content updates monthly**: Caching strategy assumes stable questions
3. **Peak usage during school hours**: Helps with infrastructure sizing
4. **Geographic concentration (Brazil)**: Can use single region initially

### Risks Mitigated

1. Architectural complexity: DDD + Clean + Modular balance it
2. Team unfamiliarity: Documentation + ADRs + training
3. Performance issues: Monitoring + budgets + clear optimization path

### Lessons to Remember

- Keep it simple until proven otherwise
- Document WHY not WHAT
- Boundaries enable scaling
- Code reviews prevent decay

---

## Maintenance & Reviews

### Architecture Review Schedule

- Every 3 months: Check if assumptions still hold
- When scale crosses 10x: Revisit decisions
- After major incidents: Post-mortems and updates
- Quarterly: Technical debt review

### Document Updates

- Memory files: Monthly
- ADRs: When decided
- ARCHITECTURE.md: Quarterly
- API docs: Per release

---

## Related Files & Links

- **Main Architecture Doc**: ARCHITECTURE.md
- **ADR 0001**: adr-0001-base-architecture.md
- **Database Schema**: packages/database/prisma/schema.prisma
- **Conventions**: CONTRIBUTING.md
- **Deployment**: docs/engineering/deployment-guide.md

---

**Version History**:

- 1.0 (2026-09-29): Initial architecture memory

**Next Review**: 2026-12-29 (3 months)

# Memory Index - MateMágico Champions

This index organizes all persistent memory files for the project. Last updated 2026-09-29.

---

## 📋 Core Memory Files

- [project-state.md](./project-state.md) — Current project status, metrics, active initiatives, team status
- [decisions.md](./decisions.md) — Decision index, architecture patterns, tech stack selections, trade-offs
- [architecture-memory.md](./architecture-memory.md) — Living architecture docs, principles, patterns, critical paths
- [technical-debt.md](./technical-debt.md) — Registered tech debt items, deferred decisions, prioritized payoff schedule
- [changelog.md](./changelog.md) — Version history, release notes, roadmap, migration guides
- [next-steps.md](./next-steps.md) — Action items, timeline, milestones, blockers, contingency plans

---

## 🔍 Quick Navigation

### By Question

**"What's the current status?"** → project-state.md  
**"Why did we choose X?"** → decisions.md  
**"How does the architecture work?"** → architecture-memory.md  
**"What tech debt exists?"** → technical-debt.md  
**"What are we building next?"** → next-steps.md  
**"What changed recently?"** → changelog.md

### By Role

**Product Manager** → project-state.md, next-steps.md  
**Architect** → architecture-memory.md, decisions.md  
**Tech Lead** → all files  
**Backend Dev** → architecture-memory.md, technical-debt.md  
**Frontend Dev** → architecture-memory.md, decisions.md  
**DevOps** → technical-debt.md, next-steps.md

### By Time Window

**This week** → next-steps.md (Immediate section)  
**Next month** → next-steps.md (Short/Medium term)  
**Next quarter** → next-steps.md (Long term), project-state.md  
**Annual planning** → changelog.md (Roadmap section)

---

## 📊 Memory Maintenance

| File                   | Owner     | Update Frequency | Last Updated |
| ---------------------- | --------- | ---------------- | ------------ |
| project-state.md       | Tech Lead | Weekly           | 2026-09-29   |
| decisions.md           | Architect | Per decision     | 2026-09-29   |
| architecture-memory.md | Architect | Monthly          | 2026-09-29   |
| technical-debt.md      | Tech Lead | Monthly          | 2026-09-29   |
| changelog.md           | DevOps    | Per release      | 2026-09-29   |
| next-steps.md          | Tech Lead | Bi-weekly        | 2026-09-29   |

---

## 🚀 How to Use This Memory System

### When Starting Work

1. Check **project-state.md** for current status
2. Check **next-steps.md** for assigned tasks
3. Review relevant **architecture-memory.md** section
4. Check **technical-debt.md** for known issues

### When Making a Decision

1. Check **decisions.md** index
2. Review related ADRs (if exist)
3. Look at **architecture-memory.md** principles
4. Document in **decisions.md** when decided

### When Problem-Solving

1. Check **architecture-memory.md** patterns
2. Review **technical-debt.md** related items
3. Search for similar decisions in **decisions.md**
4. Consult main ARCHITECTURE.md if needed

### When Onboarding

1. Read **project-state.md** (overview)
2. Study **architecture-memory.md** (10-15 min)
3. Review **next-steps.md** (what's happening)
4. Check **decisions.md** (why we chose X)

---

## 📝 Conventions for Memory Files

### File Frontmatter

Each file starts with metadata:

```
# File Title

**Document Type**: Category
**Last Updated**: YYYY-MM-DD
**Version**: X.Y.Z
**Owner/Purpose**: Description
```

### File Structure

- Organized by sections (Markdown headers)
- Tables for structured data
- Bullet points for lists
- Code blocks for examples
- Links to related files with [[file-name]]

### Update Protocol

1. Update content as needed
2. Update "Last Updated" date
3. Increment Version if significant change
4. Add entry to changelog.md if major
5. Notify stakeholders if decision-relevant

---

## 🔗 Related Documentation

### Main Documentation

- **C:\dev\Matemagico\ARCHITECTURE.md** — Main architecture document (10+ sections, comprehensive)
- **C:\dev\Matemagico\docs\architecture\ADRs\*** — Architecture Decision Records
- **C:\dev\Matemagico\docs\architecture\ADR-TEMPLATE.md** — ADR template for future decisions

### Code-Level Documentation (Future)

- `README.md` files in each module
- JSDoc in functions
- TypeScript types as documentation
- Test files as usage examples

---

## 🎯 Memory Goals

✅ **Single source of truth** for architectural decisions  
✅ **Reduce context switching** between conversations  
✅ **Enable async work** across time zones  
✅ **Preserve institutional knowledge** as team grows  
✅ **Speed up onboarding** for new team members  
✅ **Guide future decisions** with past context

---

## 🔄 Review Schedule

| Review Type     | Frequency           | Owner     | Checklist                |
| --------------- | ------------------- | --------- | ------------------------ |
| **Daily**       | Standup             | Tech Lead | Status update            |
| **Weekly**      | project-state       | Tech Lead | Metrics, blockers        |
| **Bi-weekly**   | next-steps          | Tech Lead | Timeline, progress       |
| **Monthly**     | architecture-memory | Architect | Patterns, critical paths |
| **Monthly**     | technical-debt      | Tech Lead | Debt, payoff schedule    |
| **Per release** | changelog           | DevOps    | Version, changes         |
| **Quarterly**   | All memory          | Tech Lead | Full review, updates     |

---

## ⚠️ Important Notices

### Active Blockers

- ⏸️ **Architecture approval pending** (stakeholder review needed)

### Critical Dependencies

- All implementation blocked until architecture approved

### Key Decisions Pending

- ADR-0002: Module Boundaries (next 3 days)
- ADR-0003: Database Strategy (next 5 days)
- ADR-0004: Authentication Flow (next 5 days)

### Recent Changes

- ✅ Foundation architecture completed (2026-09-29)
- ✅ All 6 memory files initialized
- ✅ ADR-0001 written
- ✅ Roadmap planned (52 days to MVP)

---

## 🆘 Troubleshooting

**"I don't know what's happening"**
→ Check project-state.md

**"I don't know why we chose X"**
→ Check decisions.md for the decision

**"I need to understand the architecture"**
→ Read architecture-memory.md overview section

**"I don't know what to work on"**
→ Check next-steps.md Immediate section

**"There's a technical issue I'm stuck on"**
→ Check technical-debt.md for known issues

**"I'm new to the project"**
→ Follow "When Onboarding" section above

---

## 📞 Support

**Architecture questions** → Architect Lead  
**Implementation questions** → Tech Lead  
**Infrastructure questions** → DevOps  
**Product questions** → Product Manager

All memory files are Living Documents — they evolve with the project.

---

**Memory System Version**: 1.0  
**Last Updated**: 2026-09-29  
**Owner**: Architecture Team  
**Status**: Active

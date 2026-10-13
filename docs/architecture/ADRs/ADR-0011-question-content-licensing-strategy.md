# ADR-0011 - Question Content Licensing Strategy

**Date**: 2026-10-10  
**Status**: Proposed (legal/pedagogical sign-off pending)  
**Deciders**: Product, Tech Lead, Content/Legal owner (to be confirmed)  
**Affects**: `packages/modules/questions`, question import pipeline, `scripts/seed.ts`, `data/questions/`

---

## 1. Context

The question bank (Prompt 04) is the first pedagogical asset of MateMágico Champions. Official OBMEP exam content is published by IMPA/OBMEP under its own terms; this repository has **no recorded permission** to redistribute or commercially reuse it. Shipping unlicensed content in the repository, seeds, or database dumps would create legal and reputational risk, and removing it later from git history is costly.

## 2. Decision

1. Every question carries provenance (`sourceName`, `sourceYear`, `sourceReference`); content without provenance is not importable into production.
2. The repository ships **only original or MOCK content**. The seed bank (`data/questions/mock-questions.json`, 100 questions) is machine-generated arithmetic content with `sourceName = "MOCK"`, created by `scripts/generate-mock-questions.ts`. It has no third-party copyright.
3. Real OBMEP content may be imported only after its use is authorized in writing and the authorization is recorded under _Authorized sources_ below. Until then it must not be committed to the repository.
4. The import pipeline never fetches content from the network; it reads files supplied by an operator.
5. Published question versions are immutable, so a licensing withdrawal is handled by archiving the question (it disappears from reader APIs) and, if required, by purging the specific rows.

### Allowed use

- Original questions written by the project team or contributing teachers who assign the rights to the project.
- MOCK/generated content for development, tests and demos.
- Third-party content explicitly licensed for the intended use (registered below), keeping attribution in `sourceName`/`sourceReference`.

### Forbidden use

- Committing, seeding or bundling OBMEP (or any third-party) exam text, images or answer keys without recorded authorization.
- Scraping or automated copying of third-party sites into the bank.
- Removing or falsifying `sourceName`/`sourceYear`/`sourceReference`.
- Presenting MOCK content as official exam questions (`sourceName = "MOCK"` marks it).

### Authorized sources

| Source                     | Scope                         | Authorization                   | Status                   |
| -------------------------- | ----------------------------- | ------------------------------- | ------------------------ |
| MOCK (generated)           | Development, tests, demo seed | Original, no third-party rights | Authorized               |
| Project-authored questions | Any                           | Contributor rights assignment   | Authorized when assigned |
| OBMEP / IMPA               | Official exams                | Written permission not obtained | **Not authorized**       |

## 3. Consequences

- The seed works offline and is safe to publish.
- A future ADR/update is required to authorize OBMEP content; at that point add a row above and import with `npm run questions:import`.
- Pedagogical quality of MOCK content is intentionally limited; it exists to exercise the platform, not to teach.

## 4. Related

- Import format: [docs/questions/IMPORT-FORMAT.md](../../questions/IMPORT-FORMAT.md)
- ADR-0003 (data strategy), ADR-0004 (authorization: `question:*` permissions)

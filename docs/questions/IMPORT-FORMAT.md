# Question Import Format (JSON and CSV)

Questions are imported by the `ImportQuestionsService` (`@matemagico/questions`). The CLI is:

```bash
npm run questions:import -- --format json --file data/questions/mock-questions.json --publish
npm run questions:import -- --format csv  --file data/questions/mock-questions.sample.csv
```

Without `--publish`, questions are created as `DRAFT`. The output is a JSON report
`{ "created": n, "skipped": n, "failed": [{ "index": n, "code": "QST-0xx" }] }`; the exit code is 1
when any row failed. A bad row never aborts the batch.

**Idempotency**: a row whose `(sourceName, sourceYear, sourceReference)` already exists is
`skipped`. Provide a unique `sourceReference` per question to make re-imports safe.

**Licensing**: see [ADR-0011](../architecture/ADRs/ADR-0011-question-content-licensing-strategy.md). Do not import third-party content without recorded authorization.

## Fields

| Field             | Required         | Rules                                                                                |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `title`           | yes              | 1-200 chars                                                                          |
| `statement`       | yes              | 1-5000 chars                                                                         |
| `level`           | yes              | `OBMEP_MIRIM`, `OBMEP_N1`, `OBMEP_N2`, `OBMEP_N3`                                    |
| `topicSlug`       | yes              | slug of an existing **ACTIVE** topic (else `QST-003`)                                |
| `sourceName`      | yes              | 1-120 chars (e.g. `OBMEP`, `MOCK`)                                                   |
| `sourceYear`      | no               | integer 1900-2100                                                                    |
| `sourceReference` | no (recommended) | up to 200 chars, e.g. `Fase 1 Questão 12`                                            |
| options           | yes              | 2 to 5 options, labels `A`-`E` unique, content 1-1000 chars, **exactly one correct** |

Invalid rows are reported as `QST-001`; an unreadable file as `QST-007`.

## JSON

An array of rows, or `{ "questions": [...] }`:

```json
[
  {
    "title": "Soma simples",
    "statement": "Quanto é 2 + 2?",
    "level": "OBMEP_N1",
    "topicSlug": "aritmetica",
    "sourceName": "OBMEP",
    "sourceYear": 2024,
    "sourceReference": "Fase 1 Questão 12",
    "options": [
      { "label": "A", "content": "3", "isCorrect": false },
      { "label": "B", "content": "4", "isCorrect": true }
    ]
  }
]
```

## CSV

RFC 4180: comma separated, UTF-8 (BOM allowed), fields with commas/quotes/newlines wrapped in
double quotes (`""` escapes a quote). Header row required with these columns (extra columns are ignored):

```text
title,statement,level,topicSlug,sourceName,sourceYear,sourceReference,optionA,optionB,optionC,optionD,optionE,correct
```

- `optionA`..`optionE`: empty cells mean the option does not exist (`optionA` and `optionB` columns are required).
- `correct`: the letter of the correct option (case-insensitive).

## Seed

`npm run seed` creates five topics and imports `data/questions/mock-questions.json` (100 MOCK
questions, published). Regenerate the files with `npm run questions:generate`.

# Editorial Question Pipeline

Question ingestion is not publication. Every imported question begins in `IMPORTED` and remains
invisible to learners, the Question Engine, exams, attempts, and rankings until an editor validates,
approves, and publishes it.

```text
XLSX import -> IMPORTED -> IN_REVIEW -> APPROVED -> PUBLISHED
                               |
                               +-> REJECTED
```

`APPROVED` or `REJECTED` questions may be returned to `IN_REVIEW`. Only `IN_REVIEW` questions may
be corrected. Published versions are immutable; creating a new version starts a new `IMPORTED`
editorial cycle.

## XLSX endpoint

`POST /questions/import/xlsx` accepts the `BANCO_QUESTOES_V11` worksheet as a binary request body
with content type
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

Required header: `x-school-id` (authorization context, not identity). Optional header:
`x-file-name`. The request requires a valid Session and `question:create` permission; only teachers
and school administrators with that permission can import. The upload limit is 10 MiB.

The parser is pinned to SheetJS 0.20.3 from the
[official SheetJS package tarball](https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz);
the public npm `xlsx` release is older and has known security advisories. Keep the manifest and
lockfile on the reviewed tarball version unless a replacement is reviewed for security.

Each worksheet row is reported as:

- `CREATED`: persisted with `status = IMPORTED`.
- `DUPLICATE`: its normalized statement, alternatives, and correct answer match existing content or
  another row in the workbook.
- `ERROR`: the row could not be parsed or validated; the report includes its row index and code.

Malformed workbooks and missing worksheets fail the request. A successful import returns its
execution ID and processed/created/duplicate/error totals. Re-uploading the same content does not
create another question.

## Editorial API

- `GET /questions/review?schoolId=...` lists imported questions by default; status, topic, grade,
  difficulty, and source type can be used as filters.
- `POST /questions/:id/review` moves an imported question into review.
- `PATCH /questions/:id` corrects content only while it is in review.
- `POST /questions/:id/approve` validates required content, an active topic, attribution, and image
  state before approval.
- `POST /questions/:id/reject` rejects a question in review.
- `POST /questions/:id/return-to-review` reopens an approved or rejected question.
- `POST /questions/:id/publish` publishes only an approved question.
- `GET /questions/editorial/dashboard?schoolId=...` reports imported, in-review, approved,
  published, rejected, and duplicate counts.

Publication requires a valid statement, 2-5 alternatives with exactly one answer, an official
question level, an explanation, an active topic, known source type/name, and author attribution.
Questions with an image URL or a non-missing image state require `imageStatus = VALID`. Imported
image URLs default to `PENDING`; an editor must verify the image before publication.

## Metadata and limitations

`gradeLevel` preserves the workbook's school grade and is not inferred into the official OBMEP
`level`. Missing or unrecognized levels remain `null` until editorial correction. Missing
attribution is represented as `authorName = "Unknown"`, `authorVerified = false`, and unknown source
type; workbook notes are retained in `sourceNotes` rather than treated as verified provenance.
`NaN` values are treated as missing.

Questions currently belong to a global bank; `schoolId` is the permission context and does not
scope imported content or editorial metrics to a school. The global curation/ownership model remains
an open architectural decision.

Do not import real OBMEP material into a persistent database or publish it without written
authorization. See [ADR-0011](../architecture/ADRs/ADR-0011-question-content-licensing-strategy.md).
The seed's 100 synthetic questions are for editorial workflow and testing; they are not published
automatically.

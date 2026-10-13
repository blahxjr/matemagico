import type { QuestionRepository, TopicLookup } from '../domain/ports';
import { QuestionsError } from '../domain/questions-error';
import { parseCsvRows, parseJsonRows, type ImportRow } from './import-parsers';
import { fingerprintForRawQuestion } from './import-xlsx.service';
import type { CreateQuestionService } from './question.services';

export type ImportFormat = 'json' | 'csv';

export interface ImportReport {
  readonly created: number;
  readonly skipped: number;
  readonly failed: readonly { index: number; code: string }[];
}

export class ImportQuestionsService {
  constructor(
    private readonly deps: {
      questions: QuestionRepository;
      topics: TopicLookup;
      create: CreateQuestionService;
    },
  ) {}

  /**
   * Creates IMPORTED questions only. A bad row never aborts the batch; it is reported by index.
   * A bad row never aborts the batch; it is reported by index.
   */
  async execute(input: { format: ImportFormat; payload: string }): Promise<ImportReport> {
    if (typeof input?.payload !== 'string') throw new QuestionsError('QST-001');
    let rows: ImportRow[];
    if (input.format === 'json') rows = parseJsonRows(input.payload);
    else if (input.format === 'csv') rows = parseCsvRows(input.payload);
    else throw new QuestionsError('QST-001');

    let created = 0;
    let skipped = 0;
    const failed: { index: number; code: string }[] = [];
    for (const [index, row] of rows.entries()) {
      try {
        const topicId =
          typeof row.topicSlug === 'string'
            ? await this.deps.topics.findActiveTopicIdBySlug(row.topicSlug)
            : null;
        if (!topicId) throw new QuestionsError('QST-003');
        if (
          await this.deps.questions.existsByFingerprint(
            fingerprintForRawQuestion({ ...row, topicId }),
          )
        ) {
          skipped += 1;
          continue;
        }
        const view = await this.deps.create.execute({ ...row, topicId });
        created += 1;
      } catch (error) {
        failed.push({
          index,
          code: error instanceof QuestionsError ? error.code : 'QST-006',
        });
      }
    }
    return { created, skipped, failed };
  }
}

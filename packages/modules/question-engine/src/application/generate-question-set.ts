import { QUESTION_LEVELS, type QuestionLevel } from '@matemagico/questions';
import {
  QuestionEngineError,
  validateQuestionSet,
  type QuestionCatalog,
  type QuestionReference,
} from '../domain/question-set';

export interface GenerateQuestionSetInput {
  readonly level: QuestionLevel;
  readonly topicId: string;
  readonly quantity: number;
  readonly seed: string;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export class ValidateQuestionSet {
  execute(questions: readonly QuestionReference[]): void {
    validateQuestionSet(questions);
  }
}

export class GenerateQuestionSet {
  constructor(private readonly catalog: QuestionCatalog) {}

  async execute(input: GenerateQuestionSetInput): Promise<QuestionReference[]> {
    if (
      !input ||
      !(QUESTION_LEVELS as readonly string[]).includes(input.level) ||
      typeof input.topicId !== 'string' ||
      !input.topicId.trim() ||
      !Number.isInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > 100 ||
      typeof input.seed !== 'string' ||
      !input.seed.trim() ||
      input.seed.length > 128
    ) {
      throw new QuestionEngineError('QEN-002');
    }
    const candidates = await this.catalog.findPublishedCurrent({
      level: input.level,
      topicId: input.topicId,
    });
    const eligible = candidates.filter(
      (question) =>
        question.status === 'PUBLISHED' &&
        question.isCurrent &&
        question.level === input.level &&
        question.topicId === input.topicId,
    );
    const unique = new Map(eligible.map((question) => [question.questionId, question]));
    if (unique.size < input.quantity) throw new QuestionEngineError('QEN-001');
    const selected = [...unique.values()]
      .sort((left, right) => {
        const leftRank = hash(`${input.seed}:${left.questionId}`);
        const rightRank = hash(`${input.seed}:${right.questionId}`);
        return leftRank - rightRank || left.questionId.localeCompare(right.questionId);
      })
      .slice(0, input.quantity)
      .map(({ questionId, questionVersion }) => ({ questionId, questionVersion }));
    validateQuestionSet(selected);
    return selected;
  }
}

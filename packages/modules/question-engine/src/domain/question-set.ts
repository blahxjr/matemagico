import type { QuestionLevel } from '@matemagico/questions';

export interface QuestionReference {
  readonly questionId: string;
  readonly questionVersion: number;
}

export interface QuestionCandidate extends QuestionReference {
  readonly level: QuestionLevel;
  readonly topicId: string;
  readonly status: string;
  readonly isCurrent: boolean;
}

export interface QuestionCatalog {
  findPublishedCurrent(input: {
    level: QuestionLevel;
    topicId: string;
  }): Promise<readonly QuestionCandidate[]>;
}

export class QuestionEngineError extends Error {
  constructor(readonly code: 'QEN-001' | 'QEN-002' | 'QEN-003') {
    super(code);
    this.name = 'QuestionEngineError';
  }
}

export function validateQuestionSet(questions: readonly QuestionReference[]): void {
  if (questions.length === 0) throw new QuestionEngineError('QEN-001');
  const seen = new Set<string>();
  for (const question of questions) {
    if (
      !question.questionId.trim() ||
      !Number.isInteger(question.questionVersion) ||
      question.questionVersion < 1
    ) {
      throw new QuestionEngineError('QEN-002');
    }
    if (seen.has(question.questionId)) throw new QuestionEngineError('QEN-003');
    seen.add(question.questionId);
  }
}

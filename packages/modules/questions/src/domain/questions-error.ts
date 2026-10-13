export type QuestionsErrorCode =
  | 'QST-001' // invalid input
  | 'QST-002' // not found
  | 'QST-003' // topic missing or inactive
  | 'QST-004' // concurrent modification (version conflict)
  | 'QST-005' // invalid state transition / immutable
  | 'QST-006' // unavailable
  | 'QST-007'; // import payload unreadable

const MESSAGES: Record<QuestionsErrorCode, string> = {
  'QST-001': 'Invalid input.',
  'QST-002': 'Question not found.',
  'QST-003': 'Topic not found or inactive.',
  'QST-004': 'Version conflict.',
  'QST-005': 'Operation not allowed in the current state.',
  'QST-006': 'Questions unavailable.',
  'QST-007': 'Import payload is not readable.',
};

export class QuestionsError extends Error {
  constructor(readonly code: QuestionsErrorCode) {
    super(MESSAGES[code]);
    this.name = 'QuestionsError';
  }
}

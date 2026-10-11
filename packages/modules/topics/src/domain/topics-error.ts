export type TopicsErrorCode =
  | 'TOP-001' // invalid input
  | 'TOP-002' // not found
  | 'TOP-003' // slug already in use
  | 'TOP-004'; // unavailable

const MESSAGES: Record<TopicsErrorCode, string> = {
  'TOP-001': 'Invalid input.',
  'TOP-002': 'Topic not found.',
  'TOP-003': 'Slug already in use.',
  'TOP-004': 'Topics unavailable.',
};

export class TopicsError extends Error {
  constructor(readonly code: TopicsErrorCode) {
    super(MESSAGES[code]);
    this.name = 'TopicsError';
  }
}

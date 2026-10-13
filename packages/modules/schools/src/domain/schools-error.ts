export type SchoolsErrorCode =
  | 'SCH-001' // invalid input
  | 'SCH-002' // not found
  | 'SCH-003' // slug already in use
  | 'SCH-004' // unavailable
  | 'SCH-005'; // not authorized

const MESSAGES: Record<SchoolsErrorCode, string> = {
  'SCH-001': 'Invalid input.',
  'SCH-002': 'School not found.',
  'SCH-003': 'Slug already in use.',
  'SCH-004': 'Schools unavailable.',
  'SCH-005': 'Not authorized.',
};

export class SchoolsError extends Error {
  constructor(readonly code: SchoolsErrorCode) {
    super(MESSAGES[code]);
    this.name = 'SchoolsError';
  }
}

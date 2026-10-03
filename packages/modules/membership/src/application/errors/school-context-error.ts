export type SchoolContextErrorCode = 'SC-001' | 'SC-002' | 'SC-003' | 'SC-004' | 'SC-005';

const GENERIC_MESSAGES: Record<SchoolContextErrorCode, string> = {
  'SC-001': 'Authentication context not valid.',
  'SC-002': 'School membership not valid.',
  'SC-003': 'School not valid.',
  'SC-004': 'Permission not granted.',
  'SC-005': 'Verification unavailable.',
};

export class SchoolContextError extends Error {
  constructor(readonly code: SchoolContextErrorCode) {
    super(GENERIC_MESSAGES[code]);
    this.name = 'SchoolContextError';
  }
}

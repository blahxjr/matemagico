export type UsersErrorCode =
  | 'USR-001' // invalid input
  | 'USR-002' // not found
  | 'USR-003' // e-mail already registered
  | 'USR-004'; // unavailable

const MESSAGES: Record<UsersErrorCode, string> = {
  'USR-001': 'Invalid input.',
  'USR-002': 'User not found.',
  'USR-003': 'E-mail already registered.',
  'USR-004': 'Users unavailable.',
};

export class UsersError extends Error {
  constructor(readonly code: UsersErrorCode) {
    super(MESSAGES[code]);
    this.name = 'UsersError';
  }
}

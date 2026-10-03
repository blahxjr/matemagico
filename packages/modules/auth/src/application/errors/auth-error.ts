export type AuthErrorCode = 'AUTH-001' | 'AUTH-002' | 'AUTH-003' | 'AUTH-004' | 'AUTH-005';

const GENERIC_MESSAGES: Record<AuthErrorCode, string> = {
  'AUTH-001': 'Authentication not allowed.',
  'AUTH-002': 'Authentication not allowed.',
  'AUTH-003': 'Invalid session.',
  'AUTH-004': 'Authentication unavailable.',
  'AUTH-005': 'Invalid input.',
};

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(GENERIC_MESSAGES[code]);
    this.name = 'AuthError';
  }
}

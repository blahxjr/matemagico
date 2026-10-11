export type MembershipErrorCode = 'MEM-001' | 'MEM-002' | 'MEM-003' | 'MEM-004' | 'MEM-005';

const GENERIC_MESSAGES: Record<MembershipErrorCode, string> = {
  'MEM-001': 'Membership state not compatible with the operation.',
  'MEM-002': 'User not available.',
  'MEM-003': 'School not available.',
  'MEM-004': 'Role not eligible.',
  'MEM-005': 'Access denied.',
};

export class MembershipError extends Error {
  constructor(
    readonly code: MembershipErrorCode,
    /** True only for an authorization decision (403); false for MEM-005 caused by an unavailable dependency. */
    readonly denied = false,
  ) {
    super(GENERIC_MESSAGES[code]);
    this.name = 'MembershipError';
  }

  static accessDenied(): MembershipError {
    return new MembershipError('MEM-005', true);
  }
}

import { AuthDomainError } from '../errors/auth-domain-error';
import {
  authAccountId,
  type AuthAccountId,
  type UserId,
  userId,
} from '../value-objects/identifiers';

export const AUTH_PROVIDER = 'credentials' as const;
export type AuthProvider = typeof AUTH_PROVIDER;

export type AuthAccountInput = Readonly<{
  authAccountId: string;
  userId: string;
  provider: string;
  subject: string;
}>;

export class AuthAccount {
  readonly id: AuthAccountId;
  readonly userId: UserId;
  readonly provider: AuthProvider;
  readonly subject: string;

  private constructor(input: AuthAccountInput) {
    this.id = authAccountId(input.authAccountId);
    this.userId = userId(input.userId);
    this.provider = AUTH_PROVIDER;
    this.subject = input.subject;
  }

  static create(input: AuthAccountInput): AuthAccount {
    if (input.provider !== AUTH_PROVIDER) {
      throw new AuthDomainError(`Unsupported Auth provider: ${input.provider}.`);
    }
    if (!input.subject.trim()) {
      throw new AuthDomainError('AuthAccount subject must not be empty.');
    }

    return new AuthAccount(input);
  }
}

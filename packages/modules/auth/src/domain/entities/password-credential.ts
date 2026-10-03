import { AuthDomainError } from '../errors/auth-domain-error';
import {
  authAccountId,
  passwordCredentialId,
  type AuthAccountId,
  type PasswordCredentialId,
} from '../value-objects/identifiers';
import { PasswordHash, type Argon2idParameters } from '../value-objects/password-hash';

export type PasswordCredentialInput = Readonly<{
  passwordCredentialId: string;
  authAccountId: string;
  encodedHash: string;
  hashParameters: Argon2idParameters;
  passwordChangedAt: Date;
}>;

export type PasswordVerificationMaterial = Readonly<{
  algorithm: 'ARGON2ID';
  encodedHash: string;
  parameters: Argon2idParameters;
}>;

export class PasswordCredential {
  readonly id: PasswordCredentialId;
  readonly authAccountId: AuthAccountId;
  readonly #hash: PasswordHash;
  readonly #passwordChangedAt: Date;

  private constructor(input: PasswordCredentialInput) {
    this.id = passwordCredentialId(input.passwordCredentialId);
    this.authAccountId = authAccountId(input.authAccountId);
    this.#hash = PasswordHash.create(input.encodedHash, input.hashParameters);
    this.#passwordChangedAt = validDate(input.passwordChangedAt, 'passwordChangedAt');
  }

  static create(input: PasswordCredentialInput): PasswordCredential {
    if (!input.authAccountId.trim()) {
      throw new AuthDomainError('authAccountId must not be empty.');
    }

    return new PasswordCredential(input);
  }

  get passwordChangedAt(): Date {
    return new Date(this.#passwordChangedAt);
  }

  verificationMaterial(): PasswordVerificationMaterial {
    return {
      algorithm: this.#hash.algorithm,
      encodedHash: this.#hash.encodedValueForVerification(),
      parameters: this.#hash.parameters,
    };
  }
}

function validDate(value: Date, name: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new AuthDomainError(`${name} must be a valid date.`);
  }

  return new Date(value);
}

import { randomUUID } from 'node:crypto';
import { AuthAccount, AUTH_PROVIDER } from '../../domain/entities/auth-account';
import { PasswordCredential } from '../../domain/entities/password-credential';
import type { CredentialStore } from '../../domain/repositories/credential-store';
import { AuthError } from '../errors/auth-error';
import type { PasswordHasher } from '../ports/password-hasher';
import type { Clock } from '../ports/runtime';

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export interface ProvisionPasswordCredentialInput {
  readonly userId: string;
  /** Login subject; the User e-mail. */
  readonly subject: string;
  readonly password: string;
}

/** Creates the credentials AuthAccount and Argon2id PasswordCredential for an existing User. */
export class ProvisionPasswordCredentialService {
  constructor(
    private readonly deps: {
      credentials: CredentialStore;
      hasher: PasswordHasher;
      clock: Clock;
      ids?: { next(): string };
    },
  ) {}

  async execute(input: ProvisionPasswordCredentialInput): Promise<{ authAccountId: string }> {
    const { userId, subject, password } = input ?? ({} as ProvisionPasswordCredentialInput);
    if (
      typeof userId !== 'string' ||
      !userId.trim() ||
      typeof subject !== 'string' ||
      !subject.trim() ||
      typeof password !== 'string' ||
      password.length < MIN_PASSWORD_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      throw new AuthError('AUTH-005');
    }

    const ids = this.deps.ids ?? { next: () => randomUUID() };
    try {
      const hashed = await this.deps.hasher.hash(password);
      const account = AuthAccount.create({
        authAccountId: ids.next(),
        userId,
        provider: AUTH_PROVIDER,
        subject: subject.trim().toLowerCase(),
      });
      const credential = PasswordCredential.create({
        passwordCredentialId: ids.next(),
        authAccountId: account.id,
        encodedHash: hashed.encodedHash,
        hashParameters: hashed.parameters,
        passwordChangedAt: this.deps.clock.now(),
      });
      const result = await this.deps.credentials.create(account, credential);
      if (result === 'CONFLICT') throw new AuthError('AUTH-005');
      return { authAccountId: account.id };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('AUTH-004');
    }
  }
}

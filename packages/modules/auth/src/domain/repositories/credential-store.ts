import type { AuthAccount } from '../entities/auth-account';
import type { PasswordCredential } from '../entities/password-credential';

export type CreateCredentialResult = 'CREATED' | 'CONFLICT';

/** Persists an AuthAccount and its PasswordCredential atomically. */
export interface CredentialStore {
  create(account: AuthAccount, credential: PasswordCredential): Promise<CreateCredentialResult>;
}

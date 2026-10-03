import type { PasswordCredential } from '../entities/password-credential';
import type { AuthAccountId } from '../value-objects/identifiers';

export interface PasswordCredentialRepository {
  findByAuthAccountId(authAccountId: AuthAccountId): Promise<PasswordCredential | null>;
}

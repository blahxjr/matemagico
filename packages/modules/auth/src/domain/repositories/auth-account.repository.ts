import type { AuthAccount } from '../entities/auth-account';
import type { UserId } from '../value-objects/identifiers';

export interface AuthAccountRepository {
  findByUserId(userId: UserId): Promise<AuthAccount | null>;
}

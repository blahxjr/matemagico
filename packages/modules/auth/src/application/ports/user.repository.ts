import type { UserId } from '../../domain/value-objects/identifiers';

export type UserIdentity = Readonly<{
  userId: UserId;
  status: string;
}>;

/** Public Users contract: only the minimum identity and state needed by Auth. */
export interface UserRepository {
  findByNormalizedEmail(normalizedEmail: string): Promise<UserIdentity | null>;
  findByUserId(userId: UserId): Promise<UserIdentity | null>;
}

export const ELIGIBLE_USER_STATUS = 'ACTIVE';

import { UsersError } from './users-error';

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface UserSnapshot {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly status: UserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 120;

export function normalizeEmail(raw: unknown): string {
  if (typeof raw !== 'string') throw new UsersError('USR-001');
  const email = raw.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw new UsersError('USR-001');
  }
  return email;
}

export class User {
  private constructor(
    readonly id: string,
    readonly email: string,
    readonly name: string,
    readonly status: UserStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(input: {
    userId: string;
    email: unknown;
    name: unknown;
    status?: UserStatus;
    now: Date;
  }): User {
    const status = input.status ?? 'ACTIVE';
    if (!USER_STATUSES.includes(status)) throw new UsersError('USR-001');
    if (typeof input.userId !== 'string' || !input.userId.trim()) throw new UsersError('USR-001');
    if (typeof input.name !== 'string') throw new UsersError('USR-001');
    const name = input.name.trim();
    if (!name || name.length > MAX_NAME_LENGTH) throw new UsersError('USR-001');
    return new User(
      input.userId,
      normalizeEmail(input.email),
      name,
      status,
      new Date(input.now),
      new Date(input.now),
    );
  }

  static restore(snapshot: UserSnapshot): User {
    return new User(
      snapshot.userId,
      snapshot.email,
      snapshot.name,
      snapshot.status,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  get isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  deactivate(now: Date): User {
    return new User(this.id, this.email, this.name, 'INACTIVE', this.createdAt, new Date(now));
  }
}

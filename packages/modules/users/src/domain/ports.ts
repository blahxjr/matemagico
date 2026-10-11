import type { User } from './user';

export type AddUserResult = 'CREATED' | 'CONFLICT';

export interface UserRepository {
  add(user: User): Promise<AddUserResult>;
  findById(userId: string): Promise<User | null>;
  /** Expects an already normalized e-mail. */
  findByEmail(normalizedEmail: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export interface UserRegisteredEvent {
  readonly userId: string;
  readonly occurredAt: Date;
}

export interface UserEventPublisher {
  publishUserRegistered(event: UserRegisteredEvent): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface UserIdGenerator {
  next(): string;
}

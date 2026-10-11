import type { AddUserResult, UserRepository } from '../domain/ports';
import type { User } from '../domain/user';

export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();

  async add(user: User): Promise<AddUserResult> {
    for (const existing of this.byId.values()) {
      if (existing.email === user.email || existing.id === user.id) return 'CONFLICT';
    }
    this.byId.set(user.id, user);
    return 'CREATED';
  }

  async findById(userId: string): Promise<User | null> {
    return this.byId.get(userId) ?? null;
  }

  async findByEmail(normalizedEmail: string): Promise<User | null> {
    for (const user of this.byId.values()) if (user.email === normalizedEmail) return user;
    return null;
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user);
  }
}

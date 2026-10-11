import { User, normalizeEmail, type UserStatus } from '../domain/user';
import type { Clock, UserEventPublisher, UserIdGenerator, UserRepository } from '../domain/ports';
import { UsersError } from '../domain/users-error';

export interface UserView {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly status: UserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const toView = (user: User): UserView => ({
  userId: user.id,
  email: user.email,
  name: user.name,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof UsersError) throw error;
    throw new UsersError('USR-004');
  }
}

export interface CreateUserInput {
  readonly email: string;
  readonly name: string;
  /** Defaults to ACTIVE; PENDING is for flows that still need e-mail verification. */
  readonly status?: 'ACTIVE' | 'PENDING';
}

export class CreateUserService {
  constructor(
    private readonly deps: {
      users: UserRepository;
      events: UserEventPublisher;
      clock: Clock;
      ids: UserIdGenerator;
    },
  ) {}

  async execute(input: CreateUserInput): Promise<UserView> {
    if (
      !input ||
      (input.status !== undefined && input.status !== 'ACTIVE' && input.status !== 'PENDING')
    ) {
      throw new UsersError('USR-001');
    }
    const now = this.deps.clock.now();
    const user = User.create({
      userId: this.deps.ids.next(),
      email: input.email,
      name: input.name,
      status: input.status,
      now,
    });

    const existing = await guard(() => this.deps.users.findByEmail(user.email));
    if (existing) throw new UsersError('USR-003');
    const result = await guard(() => this.deps.users.add(user));
    if (result === 'CONFLICT') throw new UsersError('USR-003');

    // Event delivery is best effort until the outbox exists; the User is already persisted.
    await this.deps.events
      .publishUserRegistered({ userId: user.id, occurredAt: now })
      .catch(() => undefined);
    return toView(user);
  }
}

export class GetUserService {
  constructor(private readonly deps: { users: UserRepository }) {}

  async execute(input: { userId: string }): Promise<UserView> {
    if (typeof input?.userId !== 'string' || !input.userId.trim()) throw new UsersError('USR-001');
    const user = await guard(() => this.deps.users.findById(input.userId));
    if (!user) throw new UsersError('USR-002');
    return toView(user);
  }
}

export class FindUserByEmailService {
  constructor(private readonly deps: { users: UserRepository }) {}

  async execute(input: { email: string }): Promise<UserView> {
    const email = normalizeEmail(input?.email);
    const user = await guard(() => this.deps.users.findByEmail(email));
    if (!user) throw new UsersError('USR-002');
    return toView(user);
  }
}

export class DeactivateUserService {
  constructor(private readonly deps: { users: UserRepository; clock: Clock }) {}

  async execute(input: { userId: string }): Promise<UserView> {
    if (typeof input?.userId !== 'string' || !input.userId.trim()) throw new UsersError('USR-001');
    const user = await guard(() => this.deps.users.findById(input.userId));
    if (!user) throw new UsersError('USR-002');
    if (user.status === 'INACTIVE') return toView(user);
    const deactivated = user.deactivate(this.deps.clock.now());
    await guard(() => this.deps.users.save(deactivated));
    return toView(deactivated);
  }
}

/** Public Users contract consumed by other modules (Membership, Auth). */
export class UserDirectory {
  constructor(private readonly users: UserRepository) {}

  async findUserById(userId: string): Promise<UserView | null> {
    const user = await this.users.findById(userId);
    return user ? toView(user) : null;
  }

  async findUserByEmail(email: string): Promise<UserView | null> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    return user ? toView(user) : null;
  }

  async exists(userId: string): Promise<boolean> {
    return (await this.users.findById(userId)) !== null;
  }

  /** Satisfies the Membership `UserDirectory` port. */
  async isActiveUser(userId: string): Promise<boolean> {
    const user = await this.users.findById(userId);
    return user?.isActive ?? false;
  }
}

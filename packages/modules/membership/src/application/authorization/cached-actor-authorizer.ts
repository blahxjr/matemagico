import type { ActorAuthorizer, ActorContext } from '../ports/ports';

interface Entry {
  readonly value: boolean;
  readonly expiresAt: number;
}

const CACHE_TTL_MS = 15_000;

export class InMemoryPermissionCache implements ActorAuthorizer {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly delegate: ActorAuthorizer & {
      canManageSchool?: (actor: ActorContext, schoolId: string) => Promise<boolean>;
    },
    private readonly now: () => number = Date.now,
  ) {}

  canManageSchool(actor: ActorContext, schoolId: string): Promise<boolean> {
    const canManageSchool = this.delegate.canManageSchool;
    if (!canManageSchool) {
      throw new Error('School management authorization is not configured.');
    }
    return this.resolve('manage', actor, schoolId, () =>
      canManageSchool.call(this.delegate, actor, schoolId),
    );
  }

  canAdministerSchool(actor: ActorContext, schoolId: string): Promise<boolean> {
    return this.resolve('admin', actor, schoolId, () =>
      this.delegate.canAdministerSchool(actor, schoolId),
    );
  }

  canActivateMembership(actor: ActorContext, schoolId: string): Promise<boolean> {
    return this.resolve('activate', actor, schoolId, () =>
      this.delegate.canActivateMembership(actor, schoolId),
    );
  }

  canGrantRole(actor: ActorContext, schoolId: string, roleId: string): Promise<boolean> {
    return this.resolve(`grant:${roleId}`, actor, schoolId, () =>
      this.delegate.canGrantRole(actor, schoolId, roleId),
    );
  }

  invalidateUserSchool(userId: string, schoolId: string): void {
    const prefix = `${JSON.stringify(userId)}:${JSON.stringify(schoolId)}:`;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  invalidateSchool(schoolId: string): void {
    const segment = `:${JSON.stringify(schoolId)}:`;
    for (const key of this.entries.keys()) {
      if (key.includes(segment)) this.entries.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  private async resolve(
    operation: string,
    actor: ActorContext,
    schoolId: string,
    load: () => Promise<boolean>,
  ): Promise<boolean> {
    const key = `${JSON.stringify(actor.userId)}:${JSON.stringify(schoolId)}:${operation}`;
    const cached = this.entries.get(key);
    const now = this.now();
    if (cached && cached.expiresAt > now) return cached.value;
    if (cached) this.entries.delete(key);
    const value = await load();
    this.entries.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  }
}

import { describe, expect, it, vi } from 'vitest';
import type { ActorAuthorizer } from '../ports/ports';
import { InMemoryPermissionCache } from './cached-actor-authorizer';

const actor = { userId: 'user-1' };

describe('InMemoryPermissionCache', () => {
  it('caches by actor and school, separates scopes, and invalidates by school', async () => {
    const delegate: ActorAuthorizer = {
      canAdministerSchool: vi.fn(async () => true),
      canActivateMembership: vi.fn(async () => true),
      canGrantRole: vi.fn(async () => true),
    };
    const cache = new InMemoryPermissionCache(delegate);

    await cache.canAdministerSchool(actor, 'school-1');
    await cache.canAdministerSchool(actor, 'school-1');
    expect(delegate.canAdministerSchool).toHaveBeenCalledTimes(1);
    await cache.canAdministerSchool(actor, 'school-2');
    expect(delegate.canAdministerSchool).toHaveBeenCalledTimes(2);

    cache.invalidateSchool('school-1');
    await cache.canAdministerSchool(actor, 'school-1');
    expect(delegate.canAdministerSchool).toHaveBeenCalledTimes(3);
  });

  it('does not cache rejected lookups and expires cached permissions', async () => {
    let now = 100;
    const delegate: ActorAuthorizer = {
      canAdministerSchool: vi
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue(true),
      canActivateMembership: vi.fn(async () => true),
      canGrantRole: vi.fn(async () => true),
    };
    const cache = new InMemoryPermissionCache(delegate, () => now);
    await expect(cache.canAdministerSchool(actor, 'school-1')).rejects.toThrow('offline');
    expect(await cache.canAdministerSchool(actor, 'school-1')).toBe(true);
    now += 15_001;
    expect(await cache.canAdministerSchool(actor, 'school-1')).toBe(true);
    expect(delegate.canAdministerSchool).toHaveBeenCalledTimes(3);
  });
});

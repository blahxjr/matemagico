import type { Grant } from '../../domain/entities/grant';
import type { AddGrantResult, GrantRepository } from '../../domain/repositories/grant.repository';
import type { MembershipId, RoleId } from '../../domain/value-objects/identifiers';

export class InMemoryGrantRepository implements GrantRepository {
  readonly store = new Map<string, Grant>();
  failing = false;

  async findLiveByMembershipAndRole(
    membershipId: MembershipId,
    roleId: RoleId,
    at: Date,
  ): Promise<Grant | null> {
    this.assertAvailable();
    return (
      [...this.store.values()].find(
        (g) => g.membershipId === membershipId && g.roleId === roleId && g.isLiveAt(at),
      ) ?? null
    );
  }

  async listByMembership(membershipId: MembershipId): Promise<readonly Grant[]> {
    this.assertAvailable();
    return [...this.store.values()].filter((g) => g.membershipId === membershipId);
  }

  async add(grant: Grant, at: Date): Promise<AddGrantResult> {
    this.assertAvailable();
    const conflict =
      this.store.has(grant.id) ||
      [...this.store.values()].some(
        (g) => g.membershipId === grant.membershipId && g.roleId === grant.roleId && g.isLiveAt(at),
      );
    if (conflict) return 'CONFLICT';
    this.store.set(grant.id, grant);
    return 'CREATED';
  }

  private assertAvailable(): void {
    if (this.failing) throw new Error('grant store unavailable');
  }
}

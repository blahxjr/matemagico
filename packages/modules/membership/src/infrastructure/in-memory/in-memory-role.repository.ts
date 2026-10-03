import type { Role } from '../../domain/entities/role';
import type { RoleRepository } from '../../domain/repositories/role.repository';
import type { RoleId, SchoolId, UserId } from '../../domain/value-objects/identifiers';

export class InMemoryRoleRepository implements RoleRepository {
  readonly roles = new Map<string, Role>();
  /** Allowlist per actor: roleIds the actor may grant. */
  readonly allowlist = new Map<string, Set<string>>();
  failing = false;

  async findById(id: RoleId): Promise<Role | null> {
    this.assertAvailable();
    return this.roles.get(id) ?? null;
  }

  async isGrantableByActor(actor: UserId, _schoolId: SchoolId, role: RoleId): Promise<boolean> {
    this.assertAvailable();
    return this.allowlist.get(actor)?.has(role) ?? false;
  }

  private assertAvailable(): void {
    if (this.failing) throw new Error('role catalog unavailable');
  }
}

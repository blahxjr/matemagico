import type { RolePermission } from '../../domain/entities/role-permission';
import type { PermissionRepository } from '../../domain/repositories/permission.repository';
import type { RoleId } from '../../domain/value-objects/identifiers';

export class InMemoryPermissionRepository implements PermissionRepository {
  readonly associations: RolePermission[] = [];
  failing = false;

  async findByRoleIds(roleIds: readonly RoleId[]): Promise<readonly RolePermission[]> {
    if (this.failing) throw new Error('permission catalog unavailable');
    return this.associations.filter((a) => roleIds.includes(a.roleId));
  }
}

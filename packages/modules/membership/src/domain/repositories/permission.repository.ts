import type { RolePermission } from '../entities/role-permission';
import type { RoleId } from '../value-objects/identifiers';

export interface PermissionRepository {
  /** Role–Permission associations currently in force for the given Roles. Empty means no Permission. */
  findByRoleIds(roleIds: readonly RoleId[]): Promise<readonly RolePermission[]>;
}

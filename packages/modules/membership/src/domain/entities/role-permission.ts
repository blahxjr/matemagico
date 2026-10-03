import { MembershipDomainError } from '../errors/membership-domain-error';
import { roleId, type RoleId } from '../value-objects/identifiers';

/** Catalog association Role–Permission. Permissions are only ever derived through it. */
export class RolePermission {
  private constructor(
    readonly roleId: RoleId,
    readonly permissionCode: string,
  ) {}

  static create(input: { roleId: string; permissionCode: string }): RolePermission {
    if (typeof input.permissionCode !== 'string' || !input.permissionCode.trim()) {
      throw new MembershipDomainError('permissionCode must not be empty.');
    }
    return new RolePermission(roleId(input.roleId), input.permissionCode);
  }
}

import type { PrismaClient } from '@prisma/client';
import { RolePermission } from '../../../domain/entities/role-permission';
import type { PermissionRepository } from '../../../domain/repositories/permission.repository';
import type { RoleId } from '../../../domain/value-objects/identifiers';

export class PermissionPrismaRepository implements PermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByRoleIds(roleIds: readonly RoleId[]): Promise<readonly RolePermission[]> {
    if (roleIds.length === 0) return [];
    const records = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: [...roleIds] } },
      orderBy: [{ roleId: 'asc' }, { permissionCode: 'asc' }],
    });
    return records.map((record) =>
      RolePermission.create({ roleId: record.roleId, permissionCode: record.permissionCode }),
    );
  }
}

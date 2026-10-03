import type { PrismaClient } from '@prisma/client';
import { Role } from '../../../domain/entities/role';
import type { RoleRepository } from '../../../domain/repositories/role.repository';
import type { RoleId, SchoolId, UserId } from '../../../domain/value-objects/identifiers';

export class RolePrismaRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: RoleId): Promise<Role | null> {
    const record = await this.prisma.role.findUnique({ where: { roleId: id } });
    return record
      ? Role.restore({
          roleId: record.roleId,
          code: record.code,
          scope: record.scope,
          status: record.status,
          privileged: record.privileged,
        })
      : null;
  }

  async isGrantableByActor(actorUserId: UserId, schoolId: SchoolId, roleId: RoleId) {
    const entry = await this.prisma.roleGrantAllowlist.findUnique({
      where: { actorUserId_schoolId_roleId: { actorUserId, schoolId, roleId } },
    });
    return entry !== null;
  }
}

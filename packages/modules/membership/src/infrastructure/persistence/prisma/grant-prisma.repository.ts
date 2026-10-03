import { Prisma, type PrismaClient } from '@prisma/client';
import { Grant } from '../../../domain/entities/grant';
import type {
  AddGrantResult,
  GrantRepository,
} from '../../../domain/repositories/grant.repository';
import type { MembershipId, RoleId } from '../../../domain/value-objects/identifiers';
import { isUniqueViolation } from './school-membership-prisma.repository';

const MAX_SERIALIZATION_ATTEMPTS = 3;

const toDomain = (record: Prisma.GrantGetPayload<object>): Grant =>
  Grant.restore({
    grantId: record.grantId,
    membershipId: record.membershipId,
    roleId: record.roleId,
    schoolId: record.schoolId,
    grantedBy: record.grantedBy,
    validFrom: record.validFrom,
    validUntil: record.validUntil,
    revokedAt: record.revokedAt,
  });

const isSerializationFailure = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';

const liveAt = (at: Date): Prisma.GrantWhereInput => ({
  revokedAt: null,
  OR: [{ validUntil: null }, { validUntil: { gt: at } }],
});

export class GrantPrismaRepository implements GrantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findLiveByMembershipAndRole(
    membershipId: MembershipId,
    roleId: RoleId,
    at: Date,
  ): Promise<Grant | null> {
    const record = await this.prisma.grant.findFirst({
      where: { membershipId, roleId, ...liveAt(at) },
    });
    return record ? toDomain(record) : null;
  }

  async listByMembership(membershipId: MembershipId): Promise<readonly Grant[]> {
    const records = await this.prisma.grant.findMany({
      where: { membershipId },
      orderBy: [{ validFrom: 'asc' }, { grantId: 'asc' }],
    });
    return records.map(toDomain);
  }

  /**
   * Check-then-insert under SERIALIZABLE: of two concurrent grants for the same pair one is
   * rejected by the database and re-evaluated, so both can never succeed.
   */
  async add(grant: Grant, at: Date): Promise<AddGrantResult> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const live = await tx.grant.findFirst({
              where: { membershipId: grant.membershipId, roleId: grant.roleId, ...liveAt(at) },
              select: { grantId: true },
            });
            if (live) return 'CONFLICT';
            await tx.grant.create({
              data: {
                grantId: grant.id,
                membershipId: grant.membershipId,
                roleId: grant.roleId,
                schoolId: grant.schoolId,
                grantedBy: grant.grantedBy,
                validFrom: grant.validFrom,
                validUntil: grant.validUntil,
                revokedAt: grant.revokedAt,
              },
            });
            return 'CREATED';
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isUniqueViolation(error)) return 'CONFLICT';
        if (isSerializationFailure(error) && attempt < MAX_SERIALIZATION_ATTEMPTS) continue;
        throw error;
      }
    }
  }
}

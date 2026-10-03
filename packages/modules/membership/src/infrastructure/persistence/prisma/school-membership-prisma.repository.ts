import { Prisma, type PrismaClient } from '@prisma/client';
import { SchoolMembership } from '../../../domain/entities/school-membership';
import type {
  AddMembershipResult,
  SchoolMembershipRepository,
} from '../../../domain/repositories/school-membership.repository';
import type { MembershipId, SchoolId, UserId } from '../../../domain/value-objects/identifiers';

type MembershipRecord = Prisma.SchoolMembershipGetPayload<object>;

const toDomain = (record: MembershipRecord): SchoolMembership =>
  SchoolMembership.restore({
    membershipId: record.membershipId,
    userId: record.userId,
    schoolId: record.schoolId,
    state: record.state,
    createdAt: record.createdAt,
    activatedAt: record.activatedAt,
    revokedAt: record.revokedAt,
  });

export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export class SchoolMembershipPrismaRepository implements SchoolMembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: MembershipId): Promise<SchoolMembership | null> {
    const record = await this.prisma.schoolMembership.findUnique({ where: { membershipId: id } });
    return record ? toDomain(record) : null;
  }

  async findOpenByUserAndSchool(
    userId: UserId,
    schoolId: SchoolId,
  ): Promise<SchoolMembership | null> {
    const record = await this.prisma.schoolMembership.findFirst({
      where: { userId, schoolId, state: { in: ['PENDING', 'ACTIVE'] } },
    });
    return record ? toDomain(record) : null;
  }

  async listByUserAndSchool(
    userId: UserId,
    schoolId: SchoolId,
  ): Promise<readonly SchoolMembership[]> {
    const records = await this.prisma.schoolMembership.findMany({
      where: { userId, schoolId },
      orderBy: [{ createdAt: 'asc' }, { membershipId: 'asc' }],
    });
    return records.map(toDomain);
  }

  /** Atomicity comes from the primary key and the partial unique index of open User–School pairs. */
  async add(membership: SchoolMembership): Promise<AddMembershipResult> {
    try {
      await this.prisma.schoolMembership.create({
        data: {
          membershipId: membership.id,
          userId: membership.userId,
          schoolId: membership.schoolId,
          state: membership.state,
          createdAt: membership.createdAt,
          activatedAt: membership.activatedAt,
          revokedAt: membership.revokedAt,
        },
      });
      return 'CREATED';
    } catch (error) {
      if (isUniqueViolation(error)) return 'CONFLICT';
      throw error;
    }
  }

  async activate(id: MembershipId, activatedAt: Date): Promise<boolean> {
    const result = await this.prisma.schoolMembership.updateMany({
      where: { membershipId: id, state: 'PENDING' },
      data: { state: 'ACTIVE', activatedAt },
    });
    return result.count === 1;
  }
}

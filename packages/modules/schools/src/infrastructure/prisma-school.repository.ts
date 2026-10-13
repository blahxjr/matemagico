import type { PrismaClient } from '@prisma/client';
import type { AddSchoolResult, SchoolRepository } from '../domain/ports';
import { School } from '../domain/school';

export class PrismaSchoolRepository implements SchoolRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(school: School): Promise<AddSchoolResult> {
    try {
      await this.prisma.school.create({
        data: {
          schoolId: school.id,
          name: school.name,
          slug: school.slug,
          status: school.status,
          createdAt: school.createdAt,
          updatedAt: school.updatedAt,
        },
      });
      return 'CREATED';
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') return 'CONFLICT';
      throw error;
    }
  }

  async findById(schoolId: string): Promise<School | null> {
    const record = await this.prisma.school.findUnique({ where: { schoolId } });
    return record ? toDomain(record) : null;
  }

  async findBySlug(slug: string): Promise<School | null> {
    const record = await this.prisma.school.findUnique({ where: { slug } });
    return record ? toDomain(record) : null;
  }

  async save(school: School): Promise<void> {
    await this.prisma.school.update({
      where: { schoolId: school.id },
      data: { name: school.name, status: school.status, updatedAt: school.updatedAt },
    });
  }
}

const toDomain = (record: {
  schoolId: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}): School => School.restore(record);

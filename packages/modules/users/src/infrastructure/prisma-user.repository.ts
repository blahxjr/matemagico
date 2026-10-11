import type { PrismaClient } from '@prisma/client';
import type { AddUserResult, UserRepository } from '../domain/ports';
import { User } from '../domain/user';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(user: User): Promise<AddUserResult> {
    try {
      await this.prisma.user.create({
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
      return 'CREATED';
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') return 'CONFLICT';
      throw error;
    }
  }

  async findById(userId: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { userId } });
    return record ? toDomain(record) : null;
  }

  async findByEmail(normalizedEmail: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    return record ? toDomain(record) : null;
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { userId: user.id },
      data: { name: user.name, status: user.status, updatedAt: user.updatedAt },
    });
  }
}

const toDomain = (record: {
  userId: string;
  email: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt: Date;
  updatedAt: Date;
}): User => User.restore(record);

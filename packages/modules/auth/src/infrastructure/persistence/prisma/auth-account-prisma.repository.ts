import { PrismaClient } from '@prisma/client';
import { AuthAccount } from '../../../domain/entities/auth-account';
import type { AuthAccountRepository } from '../../../domain/repositories/auth-account.repository';
import { authAccountId, type UserId, userId } from '../../../domain/value-objects/identifiers';

export class AuthAccountPrismaRepository implements AuthAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userIdValue: UserId): Promise<AuthAccount | null> {
    const record = await this.prisma.authAccount.findUnique({
      where: { userId: userIdValue },
    });
    if (!record) {
      return null;
    }

    return AuthAccount.create({
      authAccountId: authAccountId(record.authAccountId),
      userId: userId(record.userId),
      provider: record.provider,
      subject: record.subject,
    });
  }
}

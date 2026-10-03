import { PrismaClient } from '@prisma/client';
import { PasswordCredential } from '../../../domain/entities/password-credential';
import type { PasswordCredentialRepository } from '../../../domain/repositories/password-credential.repository';
import {
  authAccountId,
  type AuthAccountId,
  passwordCredentialId,
} from '../../../domain/value-objects/identifiers';

export class PasswordCredentialPrismaRepository implements PasswordCredentialRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByAuthAccountId(authAccountIdValue: AuthAccountId): Promise<PasswordCredential | null> {
    const record = await this.prisma.passwordCredential.findUnique({
      where: { authAccountId: authAccountIdValue },
    });
    if (!record) {
      return null;
    }

    return PasswordCredential.create({
      passwordCredentialId: passwordCredentialId(record.passwordCredentialId),
      authAccountId: authAccountId(record.authAccountId),
      encodedHash: record.encodedHash,
      hashParameters: {
        memoryCost: record.memoryCost,
        timeCost: record.timeCost,
        parallelism: record.parallelism,
      },
      passwordChangedAt: record.passwordChangedAt,
    });
  }
}

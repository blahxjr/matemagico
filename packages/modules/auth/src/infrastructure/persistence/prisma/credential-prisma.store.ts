import type { PrismaClient } from '@prisma/client';
import type { AuthAccount } from '../../../domain/entities/auth-account';
import type { PasswordCredential } from '../../../domain/entities/password-credential';
import type {
  CreateCredentialResult,
  CredentialStore,
} from '../../../domain/repositories/credential-store';

export class CredentialPrismaStore implements CredentialStore {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    account: AuthAccount,
    credential: PasswordCredential,
  ): Promise<CreateCredentialResult> {
    const material = credential.verificationMaterial();
    try {
      await this.prisma.$transaction([
        this.prisma.authAccount.create({
          data: {
            authAccountId: account.id,
            userId: account.userId,
            provider: account.provider,
            subject: account.subject,
          },
        }),
        this.prisma.passwordCredential.create({
          data: {
            passwordCredentialId: credential.id,
            authAccountId: credential.authAccountId,
            encodedHash: material.encodedHash,
            hashAlgorithm: material.algorithm,
            memoryCost: material.parameters.memoryCost,
            timeCost: material.parameters.timeCost,
            parallelism: material.parameters.parallelism,
            passwordChangedAt: credential.passwordChangedAt,
          },
        }),
      ]);
      return 'CREATED';
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') return 'CONFLICT';
      throw error;
    }
  }
}

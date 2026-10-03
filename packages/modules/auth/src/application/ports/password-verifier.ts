import type { PasswordVerificationMaterial } from '../../domain/entities/password-credential';

export interface PasswordVerifier {
  verify(plainPassword: string, material: PasswordVerificationMaterial): Promise<boolean>;
}

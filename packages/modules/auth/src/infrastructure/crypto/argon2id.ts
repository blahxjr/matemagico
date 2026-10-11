import { argon2id, hash, verify } from 'argon2';
import type { PasswordVerificationMaterial } from '../../domain/entities/password-credential';
import type { Argon2idParameters } from '../../domain/value-objects/password-hash';
import type { HashedPassword, PasswordHasher } from '../../application/ports/password-hasher';
import type { PasswordVerifier } from '../../application/ports/password-verifier';

/** OWASP Password Storage Cheat Sheet: Argon2id, m=19 MiB, t=2, p=1. */
export const OWASP_ARGON2ID_PARAMETERS: Argon2idParameters = Object.freeze({
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

/** Hashes with a fresh random salt; the PHC string embeds version, parameters and salt. */
export class Argon2idPasswordHasher implements PasswordHasher {
  constructor(private readonly parameters: Argon2idParameters = OWASP_ARGON2ID_PARAMETERS) {}

  async hash(plainPassword: string): Promise<HashedPassword> {
    const encodedHash = await hash(plainPassword, {
      type: argon2id,
      memoryCost: this.parameters.memoryCost,
      timeCost: this.parameters.timeCost,
      parallelism: this.parameters.parallelism,
    });
    return { encodedHash, parameters: { ...this.parameters } };
  }
}

/** Reads parameters from the stored PHC string, so hashes created with older parameters still verify. */
export class Argon2idPasswordVerifier implements PasswordVerifier {
  async verify(plainPassword: string, material: PasswordVerificationMaterial): Promise<boolean> {
    if (material.algorithm !== 'ARGON2ID' || !material.encodedHash.startsWith('$argon2id$')) {
      return false;
    }
    try {
      return await verify(material.encodedHash, plainPassword);
    } catch {
      return false;
    }
  }
}

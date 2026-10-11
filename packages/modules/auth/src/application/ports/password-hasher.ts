import type { Argon2idParameters } from '../../domain/value-objects/password-hash';

export interface HashedPassword {
  readonly encodedHash: string;
  readonly parameters: Argon2idParameters;
}

export interface PasswordHasher {
  hash(plainPassword: string): Promise<HashedPassword>;
}

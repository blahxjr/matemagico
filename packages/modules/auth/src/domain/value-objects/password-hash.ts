import { AuthDomainError } from '../errors/auth-domain-error';

export type Argon2idParameters = Readonly<{
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}>;

export class PasswordHash {
  readonly #encoded: string;
  readonly #parameters: Argon2idParameters;

  private constructor(encoded: string, parameters: Argon2idParameters) {
    this.#encoded = encoded;
    this.#parameters = Object.freeze({ ...parameters });
  }

  static create(encoded: string, parameters: Argon2idParameters): PasswordHash {
    if (typeof encoded !== 'string' || !encoded.startsWith('$argon2id$')) {
      throw new AuthDomainError('Password hash must use the Argon2id encoded format.');
    }

    if (!parameters) {
      throw new AuthDomainError('Argon2id parameters are required.');
    }
    const entries: [keyof Argon2idParameters, number][] = [
      ['memoryCost', parameters.memoryCost],
      ['timeCost', parameters.timeCost],
      ['parallelism', parameters.parallelism],
    ];
    for (const [name, value] of entries) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new AuthDomainError(`Argon2id ${name} must be a positive integer.`);
      }
    }

    return new PasswordHash(encoded, parameters);
  }

  get algorithm(): 'ARGON2ID' {
    return 'ARGON2ID';
  }

  get parameters(): Argon2idParameters {
    return { ...this.#parameters };
  }

  encodedValueForVerification(): string {
    return this.#encoded;
  }
}

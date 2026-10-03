import { describe, expect, it } from 'vitest';
import { PasswordCredential } from './password-credential';

const createCredential = (
  overrides: Partial<Parameters<typeof PasswordCredential.create>[0]> = {},
) =>
  PasswordCredential.create({
    passwordCredentialId: 'credential-1',
    authAccountId: 'auth-account-1',
    encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$c2FsdA$aGFzaA',
    hashParameters: { memoryCost: 65536, timeCost: 3, parallelism: 1 },
    passwordChangedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

describe('PasswordCredential', () => {
  it('keeps Argon2id material available only through the verification method', () => {
    const credential = createCredential();
    const serialized = JSON.stringify(credential);

    expect(serialized).not.toContain('$argon2id$');
    expect(credential.verificationMaterial()).toEqual({
      algorithm: 'ARGON2ID',
      encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$c2FsdA$aGFzaA',
      parameters: { memoryCost: 65536, timeCost: 3, parallelism: 1 },
    });
  });

  it('rejects plaintext and invalid Argon2id parameters', () => {
    expect(() => createCredential({ encodedHash: 'plain-password' })).toThrow(
      'Argon2id encoded format',
    );
    expect(() =>
      createCredential({
        hashParameters: { memoryCost: 0, timeCost: 3, parallelism: 1 },
      }),
    ).toThrow('memoryCost must be a positive integer');
  });

  it('does not expose a mutable passwordChangedAt date', () => {
    const credential = createCredential();
    const changedAt = credential.passwordChangedAt;
    changedAt.setUTCFullYear(2030);

    expect(credential.passwordChangedAt.getUTCFullYear()).toBe(2026);
  });
});

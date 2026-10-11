import { describe, expect, it } from 'vitest';
import { PasswordCredential } from '../../domain/entities/password-credential';
import type { AuthAccount } from '../../domain/entities/auth-account';
import type { CredentialStore } from '../../domain/repositories/credential-store';
import {
  Argon2idPasswordHasher,
  Argon2idPasswordVerifier,
  OWASP_ARGON2ID_PARAMETERS,
} from './argon2id';
import { ProvisionPasswordCredentialService } from '../../application/provision-password-credential/provision-password-credential.service';

const NOW = new Date('2026-10-10T12:00:00Z');
const PASSWORD = 'correct horse battery staple';
// Cheap parameters keep the suite fast; production uses OWASP_ARGON2ID_PARAMETERS.
const FAST = { memoryCost: 1024, timeCost: 1, parallelism: 1 };

function materialOf(encodedHash: string, parameters = FAST) {
  return PasswordCredential.create({
    passwordCredentialId: 'pc',
    authAccountId: 'aa',
    encodedHash,
    hashParameters: parameters,
    passwordChangedAt: NOW,
  }).verificationMaterial();
}

describe('Argon2id password hashing', () => {
  it('uses the OWASP minimum parameters by default and an Argon2id PHC string', async () => {
    expect(OWASP_ARGON2ID_PARAMETERS).toEqual({ memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const hashed = await new Argon2idPasswordHasher().hash(PASSWORD);
    expect(hashed.encodedHash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    expect(hashed.parameters).toEqual(OWASP_ARGON2ID_PARAMETERS);
    expect(hashed.encodedHash).not.toContain(PASSWORD);
  });

  it('adds a random salt: the same password never hashes twice to the same value', async () => {
    const hasher = new Argon2idPasswordHasher(FAST);
    const [a, b] = await Promise.all([hasher.hash(PASSWORD), hasher.hash(PASSWORD)]);
    expect(a.encodedHash).not.toBe(b.encodedHash);
  });

  it('verifies the right password and rejects the wrong one', async () => {
    const { encodedHash } = await new Argon2idPasswordHasher(FAST).hash(PASSWORD);
    const verifier = new Argon2idPasswordVerifier();
    expect(await verifier.verify(PASSWORD, materialOf(encodedHash))).toBe(true);
    expect(await verifier.verify('wrong password!!', materialOf(encodedHash))).toBe(false);
    expect(await verifier.verify('', materialOf(encodedHash))).toBe(false);
  });

  it('verifies hashes made with older parameters (parameters travel in the hash)', async () => {
    const old = await new Argon2idPasswordHasher({
      memoryCost: 2048,
      timeCost: 1,
      parallelism: 1,
    }).hash(PASSWORD);
    expect(
      await new Argon2idPasswordVerifier().verify(
        PASSWORD,
        materialOf(old.encodedHash, old.parameters),
      ),
    ).toBe(true);
  });

  it('fails closed on malformed or non-Argon2id material', async () => {
    const verifier = new Argon2idPasswordVerifier();
    const bad = {
      algorithm: 'ARGON2ID' as const,
      encodedHash: '$argon2id$garbage',
      parameters: FAST,
    };
    expect(await verifier.verify(PASSWORD, bad)).toBe(false);
    expect(await verifier.verify(PASSWORD, { ...bad, encodedHash: '$2b$10$abc' })).toBe(false);
    expect(await verifier.verify(PASSWORD, { ...bad, algorithm: 'BCRYPT' as never })).toBe(false);
  });
});

describe('ProvisionPasswordCredential', () => {
  function setup(result: 'CREATED' | 'CONFLICT' = 'CREATED') {
    const saved: { account: AuthAccount; credential: PasswordCredential }[] = [];
    const credentials: CredentialStore = {
      create: async (account, credential) => {
        if (result === 'CREATED') saved.push({ account, credential });
        return result;
      },
    };
    let n = 0;
    const service = new ProvisionPasswordCredentialService({
      credentials,
      hasher: new Argon2idPasswordHasher(FAST),
      clock: { now: () => NOW },
      ids: { next: () => `id-${++n}` },
    });
    return { service, saved };
  }

  it('stores an Argon2id credential that the verifier accepts', async () => {
    const { service, saved } = setup();
    const out = await service.execute({
      userId: 'u1',
      subject: ' Ana@Escola.com ',
      password: PASSWORD,
    });
    expect(out.authAccountId).toBe('id-1');
    expect(saved[0]!.account).toMatchObject({ userId: 'u1', subject: 'ana@escola.com' });
    const material = saved[0]!.credential.verificationMaterial();
    expect(material.encodedHash.startsWith('$argon2id$')).toBe(true);
    expect(await new Argon2idPasswordVerifier().verify(PASSWORD, material)).toBe(true);
  });

  it.each([
    ['short password', { userId: 'u', subject: 's', password: 'short' }],
    ['long password', { userId: 'u', subject: 's', password: 'x'.repeat(129) }],
    ['blank user', { userId: ' ', subject: 's', password: PASSWORD }],
    ['blank subject', { userId: 'u', subject: ' ', password: PASSWORD }],
    ['non-string password', { userId: 'u', subject: 's', password: 1 as never }],
  ])('rejects %s with AUTH-005', async (_name, input) => {
    await expect(setup().service.execute(input)).rejects.toMatchObject({ code: 'AUTH-005' });
    await expect(setup().service.execute(undefined as never)).rejects.toMatchObject({
      code: 'AUTH-005',
    });
  });

  it('maps conflicts to AUTH-005 and store failures to AUTH-004', async () => {
    await expect(
      setup('CONFLICT').service.execute({ userId: 'u', subject: 's', password: PASSWORD }),
    ).rejects.toMatchObject({ code: 'AUTH-005' });
    const failing = new ProvisionPasswordCredentialService({
      credentials: {
        create: async () => {
          throw new Error('db');
        },
      },
      hasher: new Argon2idPasswordHasher(FAST),
      clock: { now: () => NOW },
    });
    await expect(
      failing.execute({ userId: 'u', subject: 's', password: PASSWORD }),
    ).rejects.toMatchObject({ code: 'AUTH-004' });
  });
});

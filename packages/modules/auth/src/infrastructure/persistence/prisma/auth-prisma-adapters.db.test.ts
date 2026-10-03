import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthAccount } from '../../../domain/entities/auth-account';
import { PasswordCredential } from '../../../domain/entities/password-credential';
import { Session } from '../../../domain/entities/session';
import { authAccountId, sessionId, userId } from '../../../domain/value-objects/identifiers';
import {
  AuthAccountPrismaRepository,
  PasswordCredentialPrismaRepository,
  SessionPrismaRepository,
} from './index';

const T0 = new Date('2026-01-01T12:00:00.000Z');
const databaseUrl = process.env.TEST_DATABASE_URL;
const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;

describe.skipIf(!prisma)('Auth Prisma adapters against a real database', () => {
  const client = prisma!;
  const accounts = new AuthAccountPrismaRepository(client);
  const credentials = new PasswordCredentialPrismaRepository(client);
  const sessions = new SessionPrismaRepository(client);

  beforeEach(async () => {
    await client.passwordCredential.deleteMany();
    await client.authAccount.deleteMany();
    await client.session.deleteMany();
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('reads an AuthAccount and its PasswordCredential, and answers null when absent', async () => {
    await client.authAccount.create({
      data: {
        authAccountId: 'account-1',
        userId: 'user-1',
        provider: 'credentials',
        subject: 'ana@example.com',
      },
    });
    await client.passwordCredential.create({
      data: {
        passwordCredentialId: 'credential-1',
        authAccountId: 'account-1',
        encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$c2FsdA$aGFzaA',
        hashAlgorithm: 'ARGON2ID',
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
        passwordChangedAt: T0,
      },
    });

    const account = await accounts.findByUserId(userId('user-1'));
    expect(account).toBeInstanceOf(AuthAccount);
    expect(account).toMatchObject({ id: 'account-1', userId: 'user-1' });
    const credential = await credentials.findByAuthAccountId(authAccountId('account-1'));
    expect(credential).toBeInstanceOf(PasswordCredential);
    expect(credential).toMatchObject({ authAccountId: 'account-1' });

    expect(await accounts.findByUserId(userId('ghost'))).toBeNull();
    expect(await credentials.findByAuthAccountId(authAccountId('ghost'))).toBeNull();
  });

  it('creates a Session and finds it by id and among the active ones', async () => {
    const created = await sessions.createWithinActiveLimit(Session.create('s-1', 'user-1', T0));
    expect(created.id).toBe('s-1');
    expect((await sessions.findById(sessionId('s-1')))?.userId).toBe('user-1');
    expect(await sessions.findById(sessionId('absent'))).toBeNull();
    expect((await sessions.findActiveByUserId(userId('user-1'), T0)).map((s) => s.id)).toEqual([
      's-1',
    ]);
    expect(await sessions.findActiveByUserId(userId('user-2'), T0)).toEqual([]);
  });

  it('evicts the oldest active Session beyond the limit', async () => {
    for (let n = 1; n <= 6; n++) {
      await sessions.createWithinActiveLimit(
        Session.create(`s-${n}`, 'user-1', new Date(T0.getTime() + n * 1000)),
      );
    }
    const at = new Date(T0.getTime() + 10_000);
    const active = await sessions.findActiveByUserId(userId('user-1'), at);
    expect(active).toHaveLength(5);
    expect(active.map((s) => s.id)).not.toContain('s-1');
    expect((await sessions.findById(sessionId('s-1')))?.revokedAt).not.toBeNull();
  });

  it('revokes once: true, then false; unknown Session is false', async () => {
    await sessions.createWithinActiveLimit(Session.create('s-1', 'user-1', T0));
    const at = new Date(T0.getTime() + 1000);
    expect(await sessions.revoke(sessionId('s-1'), at, 'logout')).toBe(true);
    expect(await sessions.revoke(sessionId('s-1'), at, 'logout')).toBe(false);
    expect(await sessions.revoke(sessionId('absent'), at)).toBe(false);
    const revoked = await sessions.findById(sessionId('s-1'));
    expect(revoked?.isActiveAt(at)).toBe(false);
    expect(revoked?.revocationReason).toBe('logout');
    expect(await sessions.findActiveByUserId(userId('user-1'), at)).toEqual([]);
  });

  it('records activity on an active Session', async () => {
    await sessions.createWithinActiveLimit(Session.create('s-1', 'user-1', T0));
    const later = new Date(T0.getTime() + 60_000);
    const updated = await sessions.recordActivity(sessionId('s-1'), later);
    expect(updated.lastSeenAt).toEqual(later);
  });
});

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  PASSWORD,
  authPorts,
  databaseUrl,
  postJson,
  resetAuthTables,
  seedAccount,
  startApp,
  unreachablePrisma,
} from './test-support';

type App = Awaited<ReturnType<typeof startApp>>;

describe('GET /auth/session/:sessionId (no database needed)', () => {
  const prisma = unreachablePrisma();
  let app: App;
  beforeAll(async () => {
    app = await startApp(prisma, authPorts);
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('AUTH-005 Ã¢â€ â€™ 400 for a blank or malformed reference', async () => {
    for (const reference of ['%20', '%E0%A4%A']) {
      const res = await fetch(`${app.url}/auth/session/${reference}`);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: { code: 'AUTH-005' } });
    }
  });

  it('AUTH-004 Ã¢â€ â€™ 503 and fails closed when the database is unavailable', async () => {
    const res = await fetch(`${app.url}/auth/session/session-1`);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { code: 'AUTH-004' } });
  });

  it('rejects non-GET methods', async () => {
    const res = await postJson(`${app.url}/auth/session/session-1`, {});
    expect(res.status).toBe(405);
  });
});

describe.skipIf(!databaseUrl)('GET /auth/session/:sessionId against a real database', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  let app: App;

  beforeAll(async () => {
    app = await startApp(prisma, authPorts);
  });
  beforeEach(async () => {
    await resetAuthTables(prisma);
    await seedAccount(prisma, 'user-1', 'ana@example.com');
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const login = async () => {
    const res = await postJson(`${app.url}/auth/login`, {
      email: 'ana@example.com',
      password: PASSWORD,
    });
    return ((await res.json()) as { sessionId: string }).sessionId;
  };

  it('returns the Session created by login', async () => {
    const sessionId = await login();
    const res = await fetch(`${app.url}/auth/session/${sessionId}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sessionId, userId: 'user-1', status: 'ACTIVE' });
  });

  it('AUTH-003 Ã¢â€ â€™ 401 for an unknown Session', async () => {
    const res = await fetch(`${app.url}/auth/session/does-not-exist`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: 'AUTH-003' } });
  });

  it('AUTH-003 Ã¢â€ â€™ 401 for a revoked Session, without revealing why', async () => {
    const sessionId = await login();
    await prisma.session.update({
      where: { sessionId },
      data: { revokedAt: new Date(), revocationReason: 'logout' },
    });
    const res = await fetch(`${app.url}/auth/session/${sessionId}`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: 'AUTH-003' } });
  });

  it('AUTH-003 Ã¢â€ â€™ 401 for an expired Session', async () => {
    const sessionId = await login();
    const created = new Date(Date.now() - 9 * 3600 * 1000);
    await prisma.session.update({
      where: { sessionId },
      data: {
        createdAt: created,
        lastSeenAt: created,
        absoluteExpiresAt: new Date(created.getTime() + 8 * 3600 * 1000),
        idleExpiresAt: new Date(created.getTime() + 30 * 60 * 1000),
      },
    });
    const res = await fetch(`${app.url}/auth/session/${sessionId}`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: 'AUTH-003' } });
  });
});

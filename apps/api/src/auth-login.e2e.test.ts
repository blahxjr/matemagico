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

describe('POST /auth/login (no database needed)', () => {
  const prisma = unreachablePrisma();
  let app: App;
  beforeAll(async () => {
    app = await startApp(prisma, authPorts);
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it.each([
    ['empty body', {}],
    ['missing password', { email: 'ana@example.com' }],
    ['non-string email', { email: 1, password: PASSWORD }],
  ])('AUTH-005 → 400 for %s', async (_name, body) => {
    const res = await postJson(`${app.url}/auth/login`, body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'AUTH-005' } });
  });

  it('AUTH-005 → 400 for malformed JSON and non-object bodies', async () => {
    for (const raw of ['{not json', '[]', 'null']) {
      const res = await postJson(`${app.url}/auth/login`, raw, true);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: { code: 'AUTH-005' } });
    }
  });

  it('AUTH-004 → 503 and fails closed when the database is unavailable', async () => {
    const res = await postJson(`${app.url}/auth/login`, {
      email: 'ana@example.com',
      password: PASSWORD,
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { code: 'AUTH-004' } });
  });

  it('rejects non-POST methods', async () => {
    const res = await fetch(`${app.url}/auth/login`);
    expect(res.status).toBe(405);
  });
});

describe('POST /auth/login without the real Users port (provisional, fail closed)', () => {
  it('AUTH-001 → 401 because the provisional UserRepository finds nobody', async () => {
    const prisma = unreachablePrisma();
    const app = await startApp(prisma);
    try {
      const res = await postJson(`${app.url}/auth/login`, {
        email: 'ana@example.com',
        password: PASSWORD,
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: { code: 'AUTH-001' } });
    } finally {
      await app.close();
      await prisma.$disconnect();
    }
  });
});

describe.skipIf(!databaseUrl)('POST /auth/login against a real database', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  let app: App;

  beforeAll(async () => {
    app = await startApp(prisma, authPorts);
  });
  beforeEach(async () => {
    await resetAuthTables(prisma);
    await seedAccount(prisma, 'user-1', 'ana@example.com');
    await seedAccount(prisma, 'user-2', 'bia@example.com');
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('authenticates and persists a Session', async () => {
    const res = await postJson(`${app.url}/auth/login`, {
      email: 'Ana@Example.com',
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: string; sessionId: string };
    expect(body).toEqual({ result: 'AUTHENTICATED', sessionId: expect.any(String) });
    const stored = await prisma.session.findUnique({ where: { sessionId: body.sessionId } });
    expect(stored?.userId).toBe('user-1');
  });

  it('AUTH-001 → 401 for a wrong password, with no Session created', async () => {
    const res = await postJson(`${app.url}/auth/login`, {
      email: 'ana@example.com',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: 'AUTH-001' } });
    expect(await prisma.session.count()).toBe(0);
  });

  it('AUTH-001 → 401 for an unknown user, indistinguishable from a wrong password', async () => {
    const res = await postJson(`${app.url}/auth/login`, {
      email: 'ghost@example.com',
      password: PASSWORD,
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: { code: 'AUTH-001' } });
  });

  it('AUTH-002 → 429 after repeated failures for the same e-mail', async () => {
    const attempt = () =>
      postJson(`${app.url}/auth/login`, { email: 'bia@example.com', password: 'wrong' });
    for (let n = 0; n < 5; n++) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: { code: 'AUTH-002' } });
  });
});

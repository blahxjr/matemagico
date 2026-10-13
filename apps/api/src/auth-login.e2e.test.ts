import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PASSWORD, type App, postJson, startApp, unreachablePrisma } from './test-support';

describe('POST /auth/login (no database needed)', () => {
  const prisma = unreachablePrisma();
  let app: App;
  beforeAll(async () => {
    app = await startApp(prisma);
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

describe('POST /auth/login when the database is unreachable (real ports, fail closed)', () => {
  it('AUTH-004 -> 503 because the real UserRepository cannot reach the database', async () => {
    const prisma = unreachablePrisma();
    const app = await startApp(prisma);
    try {
      const res = await postJson(`${app.url}/auth/login`, {
        email: 'ana@example.com',
        password: PASSWORD,
      });
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: { code: 'AUTH-004' } });
    } finally {
      await app.close();
      await prisma.$disconnect();
    }
  });
});

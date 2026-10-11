import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PASSWORD,
  databaseUrl,
  ensureRoles,
  postJson,
  signUp,
  startApp,
  type App,
} from './test-support';

describe.skipIf(!databaseUrl)('POST /auth/login against a real database', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  let app: App;

  beforeAll(async () => {
    await ensureRoles(prisma);
    app = await startApp(prisma);
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('authenticates with Argon2id and persists a Session', async () => {
    const user = await signUp(app, 'ana');
    const res = await postJson(`${app.url}/auth/login`, {
      email: user.email.toUpperCase(),
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: string; sessionId: string };
    expect(body).toEqual({ result: 'AUTHENTICATED', sessionId: expect.any(String) });
    const stored = await prisma.session.findUnique({ where: { sessionId: body.sessionId } });
    expect(stored?.userId).toBe(user.userId);
    const credential = await prisma.passwordCredential.findFirstOrThrow({
      where: { authAccount: { userId: user.userId } },
    });
    expect(credential.encodedHash).toMatch(/^\$argon2id\$/);
  });

  it('AUTH-001 -> 401 for a wrong password and for an unknown user alike', async () => {
    const user = await signUp(app, 'bia');
    for (const body of [
      { email: user.email, password: 'wrong-password' },
      { email: 'ghost@escola.test', password: PASSWORD },
    ]) {
      const res = await postJson(`${app.url}/auth/login`, body);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: { code: 'AUTH-001' } });
    }
  });

  it('AUTH-002 -> 429 after repeated failures for the same e-mail', async () => {
    const user = await signUp(app, 'caio');
    const attempt = () =>
      postJson(`${app.url}/auth/login`, { email: user.email, password: 'wrong-password' });
    for (let n = 0; n < 5; n++) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: { code: 'AUTH-002' } });
  });
});

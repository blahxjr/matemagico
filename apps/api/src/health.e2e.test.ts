import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fakePrisma, startApp } from './test-support';

describe('GET /health', () => {
  const db = fakePrisma(async () => {
    throw new Error('database down');
  });
  let app: Awaited<ReturnType<typeof startApp>>;

  beforeAll(async () => {
    app = await startApp(db.prisma);
  });
  afterAll(() => app.close());

  it('answers ok without touching the database', async () => {
    const res = await fetch(`${app.url}/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(db.calls.count).toBe(0);
  });

  it('rejects non-GET methods', async () => {
    const res = await fetch(`${app.url}/health`, { method: 'POST' });
    expect(res.status).toBe(405);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(`${app.url}/unknown`);
    expect(res.status).toBe(404);
  });
});

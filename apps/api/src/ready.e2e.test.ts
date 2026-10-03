import { describe, expect, it } from 'vitest';
import { fakePrisma, startApp } from './test-support';

describe('GET /ready', () => {
  it('is ready when the composition is wired and the database answers', async () => {
    const db = fakePrisma(async () => [{ '?column?': 1 }]);
    const app = await startApp(db.prisma);
    try {
      const res = await fetch(`${app.url}/ready`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: 'ready' });
      expect(db.calls.count).toBe(1);
    } finally {
      await app.close();
    }
  });

  it('is not_ready when the database fails', async () => {
    const db = fakePrisma(async () => {
      throw new Error('connection refused');
    });
    const app = await startApp(db.prisma);
    try {
      const res = await fetch(`${app.url}/ready`);
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ status: 'not_ready' });
    } finally {
      await app.close();
    }
  });

  it('rejects non-GET methods', async () => {
    const db = fakePrisma(async () => []);
    const app = await startApp(db.prisma);
    try {
      const res = await fetch(`${app.url}/ready`, { method: 'POST' });
      expect(res.status).toBe(405);
      expect(db.calls.count).toBe(0);
    } finally {
      await app.close();
    }
  });
});

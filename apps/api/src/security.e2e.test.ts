import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from './openapi';
import { fakePrisma, startApp, unreachablePrisma } from './test-support';

const REQUIRED: Array<[string, string]> = [
  ['/auth/register', 'post'],
  ['/auth/login', 'post'],
  ['/auth/logout', 'post'],
  ['/auth/me', 'get'],
  ['/memberships', 'post'],
  ['/memberships/{membershipId}/activate', 'post'],
  ['/memberships/{membershipId}/grants', 'post'],
  ['/schools', 'post'],
  ['/schools/{schoolId}', 'get'],
  ['/exams', 'get'],
  ['/exams', 'post'],
  ['/exams/{examId}', 'get'],
  ['/exams/{examId}/publish', 'post'],
  ['/exams/{examId}/archive', 'post'],
  ['/exams/{examId}/start', 'post'],
];

describe('OpenAPI', () => {
  const doc = buildOpenApiDocument();

  it('documents every required route', () => {
    for (const [path, method] of REQUIRED) {
      expect((doc.paths as Record<string, Record<string, unknown>>)[path]?.[method]).toBeDefined();
    }
  });

  it('documents exams as top-level paths, not nested under a question operation', () => {
    const questionVersion = (doc.paths as Record<string, Record<string, unknown>>)[
      '/questions/{questionId}/version'
    ];
    expect(questionVersion).not.toHaveProperty('/exams');
  });

  it('never exposes an actor identifier in any contract', () => {
    expect(JSON.stringify(doc)).not.toMatch(/actorUserId/i);
  });

  it('is served at GET /openapi.json', async () => {
    const app = await startApp(fakePrisma(async () => []).prisma);
    try {
      const res = await fetch(`${app.url}/openapi.json`);
      expect(res.status).toBe(200);
      expect(((await res.json()) as { openapi: string }).openapi).toBe('3.1.0');
    } finally {
      await app.close();
    }
  });
});

describe('transport security (no database needed)', () => {
  it('CORS reflects only configured origins and answers preflight', async () => {
    const prisma = unreachablePrisma();
    const app = await startApp(prisma, undefined, {
      corsAllowedOrigins: ['https://app.escola.test'],
    });
    try {
      const ok = await fetch(`${app.url}/health`, {
        headers: { origin: 'https://app.escola.test' },
      });
      expect(ok.headers.get('access-control-allow-origin')).toBe('https://app.escola.test');
      const bad = await fetch(`${app.url}/health`, { headers: { origin: 'https://evil.test' } });
      expect(bad.headers.get('access-control-allow-origin')).toBeNull();
      const pre = await fetch(`${app.url}/auth/login`, {
        method: 'OPTIONS',
        headers: { origin: 'https://app.escola.test' },
      });
      expect(pre.status).toBe(204);
      expect(pre.headers.get('access-control-allow-headers')).toContain('authorization');
    } finally {
      await app.close();
      await prisma.$disconnect();
    }
  });

  it('CORS is disabled when no origin is configured', async () => {
    const app = await startApp(fakePrisma(async () => []).prisma);
    try {
      const res = await fetch(`${app.url}/health`, { headers: { origin: 'https://x.test' } });
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    } finally {
      await app.close();
    }
  });

  it('protected routes answer 401 before touching the database, even with forged identity in the query', async () => {
    const { prisma, calls } = fakePrisma(async () => []);
    const app = await startApp(prisma);
    try {
      const res = await fetch(`${app.url}/auth/me`, { headers: { authorization: 'Basic abc' } });
      expect(res.status).toBe(401);
      const query = await fetch(`${app.url}/auth/me?actorUserId=u1`);
      expect(query.status).toBe(400);
      expect(calls.count).toBe(0);
    } finally {
      await app.close();
    }
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakePrisma, startApp } from './test-support';

describe('request observability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('propagates request and correlation identifiers into response headers and structured logs', async () => {
    const output = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const app = await startApp(fakePrisma(async () => []).prisma);

    try {
      const response = await fetch(`${app.url}/health`, {
        headers: { 'x-request-id': 'request-123', 'x-correlation-id': 'correlation-456' },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('x-request-id')).toBe('request-123');
      expect(response.headers.get('x-correlation-id')).toBe('correlation-456');

      const entries = output.mock.calls.map(([line]) => JSON.parse(String(line)) as object);
      expect(entries).toContainEqual(
        expect.objectContaining({
          message: 'http.request.completed',
          requestId: 'request-123',
          correlationId: 'correlation-456',
          schoolId: null,
          module: 'platform',
          route: '/health',
          statusCode: 200,
        }),
      );
    } finally {
      await app.close();
    }
  });

  it('logs school-scoped failures with correlation metadata without logging request payloads', async () => {
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = await startApp(fakePrisma(async () => []).prisma);

    try {
      const response = await fetch(`${app.url}/memberships`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'membership-request',
          'x-correlation-id': 'membership-correlation',
        },
        body: JSON.stringify({
          userId: 'private-user-value',
          schoolId: 'school-42',
        }),
      });

      expect(response.status).toBe(401);
      const entries = [...warnings.mock.calls, ...errors.mock.calls].map(([line]) => String(line));
      expect(entries.join('\n')).not.toContain('private-user-value');
      expect(entries.join('\n')).toContain('"requestId":"membership-request"');
      expect(entries.join('\n')).toContain('"correlationId":"membership-correlation"');
      expect(entries.join('\n')).toContain('"module":"membership"');
      expect(entries.join('\n')).toContain('"errorCode":"AUTH-003"');
    } finally {
      await app.close();
    }
  });
});

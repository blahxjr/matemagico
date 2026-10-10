import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { addLogContext, logger, withLogContext } from '@matemagico/logger';
import type { CompositionRoot } from '@matemagico/composition-root';
import { handleAuthRoute } from './auth-routes';
import { handleMembershipRoute } from './membership-routes';
import { sendJson } from './http';

const READINESS_TIMEOUT_MS = 2000;

function send(res: ServerResponse, statusCode: number, body: { status: string }) {
  sendJson(res, statusCode, body);
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function getHeaderId(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : undefined;
}

function getModule(path: string): string {
  if (path.startsWith('/auth/')) return 'auth';
  if (path === '/memberships' || path.startsWith('/memberships/')) return 'membership';
  return 'platform';
}

function getRoute(path: string): string {
  if (path === '/auth/login') return path;
  if (/^\/auth\/session\/[^/]+$/.test(path)) return '/auth/session/:sessionId';
  if (path === '/memberships') return path;
  if (/^\/memberships\/[^/]+\/activate$/.test(path)) return '/memberships/:membershipId/activate';
  if (/^\/memberships\/[^/]+\/grants$/.test(path)) return '/memberships/:membershipId/grants';
  if (path === '/health' || path === '/ready') return path;
  return 'unmatched';
}

/** Ready only when the composition is complete and the database answers; any doubt means not ready. */
export async function isReady(root: CompositionRoot): Promise<boolean> {
  try {
    const wired =
      Object.values(root.services).every(Boolean) &&
      Object.values(root.repositories).every(Boolean);
    if (!wired) {
      logger.error('api.readiness.failed', { reason: 'composition_incomplete' });
      return false;
    }

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), READINESS_TIMEOUT_MS);
    });
    try {
      await Promise.race([root.prisma.$queryRaw`SELECT 1`, timeout]);
    } finally {
      clearTimeout(timer);
    }
    return true;
  } catch (error) {
    logger.error('api.readiness.failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return false;
  }
}

export function createApp(root: CompositionRoot): Server {
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    const path = (req.url ?? '').split('?')[0];
    const requestId = getHeaderId(req.headers['x-request-id']) ?? randomUUID();
    const correlationId = getHeaderId(req.headers['x-correlation-id']) ?? requestId;
    const module = getModule(path);
    const startedAt = Date.now();

    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);

    withLogContext({ requestId, correlationId, module, schoolId: null }, () => {
      res.once('finish', () => {
        const context = {
          method: req.method ?? 'UNKNOWN',
          route: getRoute(path),
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        };
        if (res.statusCode >= 500) logger.error('http.request.completed', context);
        else if (res.statusCode >= 400) logger.warn('http.request.completed', context);
        else logger.info('http.request.completed', context);
      });

      try {
        if (path === '/health' || path === '/ready') {
          if (req.method !== 'GET') {
            res.setHeader('allow', 'GET');
            return send(res, 405, { status: 'method_not_allowed' });
          }
          if (path === '/health') return send(res, 200, { status: 'ok' });
          void isReady(root).then((ready) =>
            ready ? send(res, 200, { status: 'ready' }) : send(res, 503, { status: 'not_ready' }),
          );
          return;
        }

        if (handleAuthRoute(root, req, res, path)) return;
        if (handleMembershipRoute(root, req, res, path)) return;

        send(res, 404, { status: 'not_found' });
      } catch (error) {
        logger.error('http.request.unhandled_error', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
        if (!res.headersSent) sendJson(res, 500, { error: { code: 'INTERNAL_ERROR' } });
        else res.destroy();
      }
    });
  });
}

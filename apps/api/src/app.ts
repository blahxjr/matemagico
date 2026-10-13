import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { addLogContext, logger, withLogContext } from '@matemagico/logger';
import type { CompositionRoot } from '@matemagico/composition-root';
import { handleAuthRoute } from './auth-routes';
import { handleMembershipRoute } from './membership-routes';
import { handleSchoolRoute } from './school-routes';
import { handleQuestionRoute } from './question-routes';
import { handleTopicRoute } from './topic-routes';
import { handleMockExamRoute } from './mock-exam-routes';
import { handleAttemptRoute } from './attempt-routes';
import { handleReportRoute } from './report-routes';
import { sendJson } from './http';
import { buildOpenApiDocument } from './openapi';
import { MetricsRegistry } from './metrics';

export interface AppOptions {
  /** Exact origins allowed by CORS (CORS_ALLOWED_ORIGINS). Empty disables CORS headers. */
  readonly corsAllowedOrigins?: readonly string[];
}

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
  if (path === '/schools' || path.startsWith('/schools/')) return 'schools';
  if (path === '/topics' || path.startsWith('/topics/')) return 'topics';
  if (path === '/questions' || path.startsWith('/questions/')) return 'questions';
  if (path === '/exams' || path.startsWith('/exams/')) return 'mock-exams';
  if (path === '/attempts' || path.startsWith('/attempts/')) return 'attempts';
  if (path.startsWith('/rankings/') || path.startsWith('/performance/')) return 'rankings';
  return 'platform';
}

/** Only these read routes accept a (strictly validated) query string. */
const QUERY_ROUTES = [
  /^\/topics(\/[^/]+)?$/,
  /^\/questions(\/[^/]+)?$/,
  /^\/questions\/review$/,
  /^\/questions\/editorial-dashboard$/,
  /^\/exams(\/[^/]+)?$/,
  /^\/attempts\/history$/,
  /^\/attempts\/[^/]+$/,
  /^\/memberships$/,
  /^\/rankings\/school$/,
  /^\/rankings\/exams\/[^/]+$/,
  /^\/performance\/school$/,
];

function getRoute(path: string): string {
  if (path === '/topics' || path === '/questions' || path === '/exams') return path;
  if (path === '/questions/review' || path === '/questions/editorial-dashboard') return path;
  if (path === '/questions/import/xlsx') return path;
  if (path === '/attempts' || path === '/attempts/history') return path;
  if (path === '/memberships' || path === '/rankings/school' || path === '/performance/school') {
    return path;
  }
  if (/^\/rankings\/exams\/[^/]+$/.test(path)) return '/rankings/exams/:examId';
  if (/^\/topics\/[^/]+$/.test(path)) return '/topics/:topicId';
  if (/^\/questions\/[^/]+$/.test(path)) return '/questions/:questionId';
  if (
    /^\/questions\/[^/]+\/(publish|archive|version|review|approve|reject|return-to-review)$/.test(
      path,
    )
  ) {
    return `/questions/:questionId/${path.split('/')[3]}`;
  }
  if (/^\/exams\/[^/]+\/(publish|archive|start)$/.test(path)) {
    return `/exams/:examId/${path.split('/')[3]}`;
  }
  if (/^\/exams\/[^/]+\/attempts$/.test(path)) return '/exams/:examId/attempts';
  if (/^\/attempts\/[^/]+\/(answers|finish|expire)$/.test(path))
    return `/attempts/:attemptId/${path.split('/')[3]}`;
  if (/^\/attempts\/[^/]+$/.test(path)) return '/attempts/:attemptId';
  if (/^\/exams\/[^/]+$/.test(path)) return '/exams/:examId';
  if (['/auth/login', '/auth/register', '/auth/logout', '/auth/me'].includes(path)) return path;
  if (path === '/schools') return path;
  if (/^\/schools\/[^/]+$/.test(path)) return '/schools/:schoolId';
  if (path === '/openapi.json') return path;
  if (path === '/me/export' || path === '/me/deactivate') return path;
  if (path === '/memberships') return path;
  if (/^\/memberships\/[^/]+\/activate$/.test(path)) return '/memberships/:membershipId/activate';
  if (/^\/memberships\/[^/]+\/grants$/.test(path)) return '/memberships/:membershipId/grants';
  if (path === '/health' || path === '/ready' || path === '/metrics') return path;
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
      const [status] = await Promise.race([
        root.prisma.$queryRaw<
          {
            databaseAvailable: number;
            migrationTableAvailable: boolean;
            migrationsComplete: boolean;
            auditPersistenceAvailable: boolean;
            rateLimitPersistenceAvailable: boolean;
          }[]
        >`
          SELECT
            1 AS "databaseAvailable",
            to_regclass('public."_prisma_migrations"') IS NOT NULL AS "migrationTableAvailable",
            NOT EXISTS (
              SELECT 1 FROM public."_prisma_migrations"
              WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
            ) AS "migrationsComplete",
            to_regclass('public."AuditEvent"') IS NOT NULL AS "auditPersistenceAvailable",
            to_regclass('public."LoginAttemptCounter"') IS NOT NULL AS "rateLimitPersistenceAvailable"
        `,
        timeout,
      ]);
      return Boolean(
        status?.databaseAvailable === 1 &&
        status.migrationTableAvailable &&
        status.migrationsComplete &&
        status.auditPersistenceAvailable &&
        status.rateLimitPersistenceAvailable &&
        root.permissionCache &&
        typeof root.permissionCache.clear === 'function',
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    logger.error('api.readiness.failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return false;
  }
}

export function createApp(root: CompositionRoot, options: AppOptions = {}): Server {
  const allowedOrigins = new Set(options.corsAllowedOrigins ?? []);
  const metrics = new MetricsRegistry();
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    const [path = '', query] = (req.url ?? '').split('?');
    const requestId = getHeaderId(req.headers['x-request-id']) ?? randomUUID();
    const correlationId = getHeaderId(req.headers['x-correlation-id']) ?? requestId;
    const module = getModule(path);
    const startedAt = Date.now();

    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');

    withLogContext(
      {
        requestId,
        correlationId,
        module,
        actorUserId: null,
        schoolId: null,
        operation: `${req.method ?? 'UNKNOWN'} ${getRoute(path)}`,
      },
      () => {
        res.once('finish', () => {
          const durationMs = Date.now() - startedAt;
          const route = getRoute(path);
          metrics.observeHttp(route, req.method ?? 'UNKNOWN', res.statusCode, durationMs);
          const context = {
            method: req.method ?? 'UNKNOWN',
            route,
            operation: `${req.method ?? 'UNKNOWN'} ${route}`,
            statusCode: res.statusCode,
            durationMs,
          };
          if (res.statusCode >= 500) logger.error('http.request.completed', context);
          else if (res.statusCode >= 400) logger.warn('http.request.completed', context);
          else logger.info('http.request.completed', context);
        });

        try {
          const origin = req.headers.origin;
          if (typeof origin === 'string' && allowedOrigins.has(origin)) {
            res.setHeader('access-control-allow-origin', origin);
            res.setHeader('vary', 'Origin');
            res.setHeader('access-control-expose-headers', 'x-request-id, x-correlation-id');
            if (req.method === 'OPTIONS') {
              res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, OPTIONS');
              res.setHeader(
                'access-control-allow-headers',
                'authorization, content-type, x-request-id, x-correlation-id',
              );
              res.setHeader('access-control-max-age', '600');
              res.writeHead(204);
              return void res.end();
            }
          }

          if (path === '/openapi.json') {
            if (req.method !== 'GET') {
              res.setHeader('allow', 'GET');
              return send(res, 405, { status: 'method_not_allowed' });
            }
            return sendJson(res, 200, buildOpenApiDocument());
          }

          // Query strings are not part of any contract: identity (or anything else) cannot ride on them.
          const queryAllowed =
            req.method === 'GET' && QUERY_ROUTES.some((route) => route.test(path));
          if (
            query !== undefined &&
            path !== '/health' &&
            path !== '/ready' &&
            path !== '/metrics' &&
            !queryAllowed
          ) {
            return sendJson(res, 400, { error: { code: 'INVALID_REQUEST' } });
          }

          if (path === '/metrics') {
            if (req.method !== 'GET') {
              res.setHeader('allow', 'GET');
              return send(res, 405, { status: 'method_not_allowed' });
            }
            res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
            res.setHeader('cache-control', 'no-store');
            res.writeHead(200);
            return void res.end(metrics.renderPrometheus());
          }

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
          if (handleSchoolRoute(root, req, res, path)) return;
          if (handleTopicRoute(root, req, res, path)) return;
          if (handleQuestionRoute(root, req, res, path)) return;
          if (handleMockExamRoute(root, req, res, path)) return;
          if (handleAttemptRoute(root, req, res, path)) return;
          if (handleReportRoute(root, req, res, path)) return;

          send(res, 404, { status: 'not_found' });
        } catch (error) {
          logger.error('http.request.unhandled_error', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
          });
          if (!res.headersSent) sendJson(res, 500, { error: { code: 'INTERNAL_ERROR' } });
          else res.destroy();
        }
      },
    );
  });
}

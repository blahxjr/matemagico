import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { CompositionRoot } from '@matemagico/composition-root';
import { handleAuthRoute } from './auth-routes';
import { handleMembershipRoute } from './membership-routes';
import { sendJson } from './http';

const READINESS_TIMEOUT_MS = 2000;

function send(res: ServerResponse, statusCode: number, body: { status: string }) {
  sendJson(res, statusCode, body);
}

/** Ready only when the composition is complete and the database answers; any doubt means not ready. */
export async function isReady(root: CompositionRoot): Promise<boolean> {
  try {
    const wired =
      Object.values(root.services).every(Boolean) &&
      Object.values(root.repositories).every(Boolean);
    if (!wired) return false;

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
  } catch {
    return false;
  }
}

export function createApp(root: CompositionRoot): Server {
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    const path = (req.url ?? '').split('?')[0];

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
  });
}

import type { IncomingMessage, ServerResponse } from 'node:http';
import { AuthError, type AuthErrorCode } from '@matemagico/auth';
import { logger } from '@matemagico/logger';
import type { CompositionRoot } from '@matemagico/composition-root';
import { InvalidBodyError, readJsonObject, sendJson } from './http';

/** Only the existing Auth error codes are exposed; the message stays generic. */
const STATUS_BY_CODE: Record<AuthErrorCode, number> = {
  'AUTH-001': 401,
  'AUTH-002': 429,
  'AUTH-003': 401,
  'AUTH-004': 503,
  'AUTH-005': 400,
};

function sendAuthError(res: ServerResponse, error: unknown): void {
  // Fail closed: anything that is not a known AuthError is a dependency failure.
  const code: AuthErrorCode = error instanceof AuthError ? error.code : 'AUTH-004';
  const context = {
    errorCode: code,
    errorName: error instanceof Error ? error.name : 'UnknownError',
  };
  if (STATUS_BY_CODE[code] >= 500) logger.error('auth.request.failed', context);
  else logger.warn('auth.request.failed', context);
  sendJson(res, STATUS_BY_CODE[code], { error: { code } });
}

const SESSION_PATH = /^\/auth\/session\/([^/]+)$/;

/** Returns true when the request was an Auth route (handled or rejected). */
export function handleAuthRoute(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): boolean {
  if (path === '/auth/login') {
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST');
      sendJson(res, 405, { status: 'method_not_allowed' });
    } else {
      void login(root, req, res);
    }
    return true;
  }

  const session = SESSION_PATH.exec(path);
  if (session) {
    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET');
      sendJson(res, 405, { status: 'method_not_allowed' });
    } else {
      void getSession(root, decodeSegment(session[1]!), res);
    }
    return true;
  }
  return false;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return '';
  }
}

async function login(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await readJsonObject(req);
    const output = await root.services.authenticateUser.execute({
      email: body.email as string,
      password: body.password as string,
      clientIp: req.socket.remoteAddress ?? '',
    });
    sendJson(res, 200, { result: output.result, sessionId: output.sessionId });
  } catch (error) {
    sendAuthError(res, error instanceof InvalidBodyError ? new AuthError('AUTH-005') : error);
  }
}

async function getSession(root: CompositionRoot, sessionId: string, res: ServerResponse) {
  try {
    const output = await root.services.getSession.execute({ sessionId });
    sendJson(res, 200, {
      sessionId: output.sessionId,
      userId: output.userId,
      status: 'ACTIVE',
    });
  } catch (error) {
    sendAuthError(res, error);
  }
}

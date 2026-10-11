import type { IncomingMessage, ServerResponse } from 'node:http';
import { AuthError } from '@matemagico/auth';
import type { CompositionRoot } from '@matemagico/composition-root';
import { authenticate } from './authentication-middleware';
import { sendError } from './errors';
import { methodNotAllowed, readBody, sendJson, InvalidBodyError } from './http';
import { loginBody, registerBody } from './schemas';

type Handler = (root: CompositionRoot, req: IncomingMessage, res: ServerResponse) => Promise<void>;

const ROUTES: Record<string, { method: 'GET' | 'POST'; handler: Handler }> = {
  '/auth/register': { method: 'POST', handler: register },
  '/auth/login': { method: 'POST', handler: login },
  '/auth/logout': { method: 'POST', handler: logout },
  '/auth/me': { method: 'GET', handler: me },
};

/** Returns true when the request was an Auth route (handled or rejected). */
export function handleAuthRoute(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): boolean {
  const route = ROUTES[path];
  if (!route) return false;
  if (req.method !== route.method) {
    methodNotAllowed(res, route.method);
    return true;
  }
  void route
    .handler(root, req, res)
    .catch((error) =>
      sendError(
        res,
        error instanceof InvalidBodyError ? new AuthError('AUTH-005') : error,
        'AUTH-004',
      ),
    );
  return true;
}

const clientIp = (req: IncomingMessage) => req.socket.remoteAddress ?? '';

async function register(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  // Public endpoint: throttled per IP with the same limiter as login.
  if (!(await root.attemptLimiter.registerIpRequest(clientIp(req), new Date()))) {
    throw new AuthError('AUTH-002');
  }
  const body = await readBody(req, registerBody);
  const user = await root.services.registerUser.execute(body);
  sendJson(res, 201, { userId: user.userId, email: user.email, name: user.name });
}

async function login(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req, loginBody);
  const output = await root.services.authenticateUser.execute({
    email: body.email,
    password: body.password,
    clientIp: clientIp(req),
  });
  sendJson(res, 200, { result: output.result, sessionId: output.sessionId });
}

async function logout(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const actor = await authenticate(root, req);
  await root.services.logoutUser.execute({ currentSessionId: actor.sessionId });
  sendJson(res, 200, { result: 'REVOKED' });
}

async function me(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const actor = await authenticate(root, req);
  const profile = await root.services.getProfile.execute({ userId: actor.userId });
  sendJson(res, 200, profile);
}

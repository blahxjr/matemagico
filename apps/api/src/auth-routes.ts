import type { IncomingMessage, ServerResponse } from 'node:http';
import { AuthError } from '@matemagico/auth';
import type { CompositionRoot } from '@matemagico/composition-root';
import { addLogContext } from '@matemagico/logger';
import { authenticate } from './authentication-middleware';
import { sendError } from './errors';
import { methodNotAllowed, readBody, sendJson, InvalidBodyError } from './http';
import { loginBody, registerBody } from './schemas';
import { recordAudit } from './audit';

type Handler = (root: CompositionRoot, req: IncomingMessage, res: ServerResponse) => Promise<void>;

const ROUTES: Record<string, { method: 'GET' | 'POST'; handler: Handler }> = {
  '/auth/register': { method: 'POST', handler: register },
  '/auth/login': { method: 'POST', handler: login },
  '/auth/logout': { method: 'POST', handler: logout },
  '/auth/me': { method: 'GET', handler: me },
  '/me/export': { method: 'GET', handler: exportMyData },
  '/me/deactivate': { method: 'POST', handler: deactivateMe },
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
  try {
    const body = await readBody(req, loginBody);
    const output = await root.services.authenticateUser.execute({
      email: body.email,
      password: body.password,
      clientIp: clientIp(req),
    });
    addLogContext({ actorUserId: output.userId });
    await recordAudit(root, {
      actorUserId: output.userId,
      action: 'auth.login.succeeded',
      targetType: 'Session',
      targetId: output.sessionId,
    });
    sendJson(res, 200, { result: output.result, sessionId: output.sessionId });
  } catch (error) {
    if (error instanceof AuthError && (error.code === 'AUTH-001' || error.code === 'AUTH-002')) {
      await recordAudit(root, {
        actorUserId: null,
        action: 'auth.login.failed',
        targetType: 'Authentication',
        reason: error.code,
      });
    }
    throw error;
  }
}

async function logout(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const actor = await authenticate(root, req);
  await root.services.logoutUser.execute({ currentSessionId: actor.sessionId });
  await recordAudit(root, {
    actorUserId: actor.userId,
    action: 'auth.logout',
    targetType: 'Session',
    targetId: actor.sessionId,
  });
  sendJson(res, 200, { result: 'REVOKED' });
}

async function me(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const actor = await authenticate(root, req);
  const profile = await root.services.getProfile.execute({ userId: actor.userId });
  sendJson(res, 200, profile);
}

async function exportMyData(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const actor = await authenticate(root, req);
  const profile = await root.services.getProfile.execute({ userId: actor.userId });
  const memberships = await root.prisma.schoolMembership.findMany({
    where: { userId: actor.userId },
    orderBy: [{ schoolId: 'asc' }, { createdAt: 'asc' }],
    select: {
      membershipId: true,
      schoolId: true,
      state: true,
      createdAt: true,
      activatedAt: true,
      revokedAt: true,
    },
  });
  const schoolIds = [...new Set(memberships.map(({ schoolId }) => schoolId))];
  const attempts = (
    await Promise.all(
      schoolIds.map((schoolId) =>
        root.services.getAttemptHistory.execute({ userId: actor.userId, schoolId }),
      ),
    )
  ).flat();

  await recordAudit(root, {
    actorUserId: actor.userId,
    action: 'privacy.data.exported',
    targetType: 'User',
    targetId: actor.userId,
    metadata: { membershipCount: memberships.length, attemptCount: attempts.length },
  });
  sendJson(res, 200, { profile, memberships, attempts });
}

async function deactivateMe(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const actor = await authenticate(root, req);
  const profile = await root.services.getProfile.execute({ userId: actor.userId });
  await root.services.deactivateUser.execute({ userId: actor.userId });
  for (const school of profile.schools) {
    root.permissionCache.invalidateUserSchool(actor.userId, school.schoolId);
  }
  await root.prisma.session.updateMany({
    where: { userId: actor.userId, revokedAt: null },
    data: { revokedAt: new Date(), revocationReason: 'USER_DEACTIVATED' },
  });
  await recordAudit(root, {
    actorUserId: actor.userId,
    action: 'privacy.user.deactivated',
    targetType: 'User',
    targetId: actor.userId,
  });
  sendJson(res, 200, { result: 'DEACTIVATED' });
}

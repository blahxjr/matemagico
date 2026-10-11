import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CompositionRoot } from '@matemagico/composition-root';
import { addLogContext } from '@matemagico/logger';
import { authenticate } from './authentication-middleware';
import { sendError } from './errors';
import { methodNotAllowed, parseParam, readBody, sendJson } from './http';
import { activateMembershipBody, createMembershipBody, grantRoleBody } from './schemas';

const COLLECTION_PATH = '/memberships';
const ACTION_PATH = /^\/memberships\/([^/]+)\/(activate|grants)$/;

/** Returns true when the request was a Membership route (handled or rejected). */
export function handleMembershipRoute(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): boolean {
  const action = ACTION_PATH.exec(path);
  if (path !== COLLECTION_PATH && !action) return false;

  if (req.method !== 'POST') {
    methodNotAllowed(res, 'POST');
    return true;
  }

  const run = async () => {
    // Authentication first: the Actor is the Session's User, never a client-supplied value.
    const actor = await authenticate(root, req);
    if (!action) return create(root, req, res, actor.userId);
    const membershipId = parseParam(action[1]);
    if (action[2] === 'activate') return activate(root, req, res, actor.userId, membershipId);
    return grant(root, req, res, actor.userId, membershipId);
  };
  void run().catch((error) => sendError(res, error, 'MEM-005'));
  return true;
}

async function create(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  actorUserId: string,
) {
  const body = await readBody(req, createMembershipBody);
  addLogContext({ schoolId: body.schoolId });
  const output = await root.services.createMembership.execute({
    actor: { userId: actorUserId },
    userId: body.userId,
    schoolId: body.schoolId,
  });
  sendJson(res, 201, { membershipId: output.membershipId, state: output.state });
}

async function activate(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  actorUserId: string,
  membershipId: string,
) {
  await readBody(req, activateMembershipBody, { emptyAs: {} });
  const output = await root.services.activateMembership.execute({
    membershipId,
    actor: { userId: actorUserId },
  });
  addLogContext({ schoolId: output.schoolId });
  sendJson(res, 200, { result: 'ACTIVATED' });
}

async function grant(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  actorUserId: string,
  membershipId: string,
) {
  const body = await readBody(req, grantRoleBody);
  // The contract body carries no validity window: the Grant starts when the server receives it.
  const output = await root.services.grantRole.execute({
    membershipId,
    roleId: body.roleId,
    validFrom: new Date(),
    actor: { userId: actorUserId },
  });
  addLogContext({ schoolId: output.schoolId });
  sendJson(res, 201, { grantId: output.grantId });
}

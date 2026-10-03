import type { IncomingMessage, ServerResponse } from 'node:http';
import { MembershipError, type MembershipErrorCode } from '@matemagico/membership';
import type { CompositionRoot } from '@matemagico/composition-root';
import { InvalidBodyError, readJsonObject, sendJson } from './http';

/** Only the existing Membership error codes are exposed; the message stays generic. */
const STATUS_BY_CODE: Record<MembershipErrorCode, number> = {
  'MEM-001': 403,
  'MEM-002': 404,
  'MEM-003': 404,
  'MEM-004': 409,
  'MEM-005': 503,
};

class InvalidRequestError extends Error {}

function sendMembershipError(res: ServerResponse, error: unknown): void {
  if (error instanceof InvalidRequestError || error instanceof InvalidBodyError) {
    return sendJson(res, 400, { error: { code: 'INVALID_REQUEST' } });
  }
  // Fail closed: anything that is not a known MembershipError is MEM-005.
  const code: MembershipErrorCode = error instanceof MembershipError ? error.code : 'MEM-005';
  sendJson(res, STATUS_BY_CODE[code], { error: { code } });
}

function requireStrings<K extends string>(
  body: Record<string, unknown>,
  keys: readonly K[],
): Record<K, string> {
  const result = {} as Record<K, string>;
  for (const key of keys) {
    const value = body[key];
    if (typeof value !== 'string' || !value.trim()) throw new InvalidRequestError();
    result[key] = value;
  }
  return result;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw new InvalidRequestError();
  }
}

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
    res.setHeader('allow', 'POST');
    sendJson(res, 405, { status: 'method_not_allowed' });
    return true;
  }

  const run = async () => {
    try {
      const body = await readJsonObject(req);
      if (!action) return await create(root, body, res);
      const membershipId = decodeSegment(action[1]!);
      if (!membershipId.trim()) throw new InvalidRequestError();
      if (action[2] === 'activate') return await activate(root, membershipId, body, res);
      return await grant(root, membershipId, body, res);
    } catch (error) {
      sendMembershipError(res, error);
    }
  };
  void run();
  return true;
}

async function create(root: CompositionRoot, body: Record<string, unknown>, res: ServerResponse) {
  const { actorUserId, userId, schoolId } = requireStrings(body, [
    'actorUserId',
    'userId',
    'schoolId',
  ]);
  const output = await root.services.createMembership.execute({
    actor: { userId: actorUserId },
    userId,
    schoolId,
  });
  sendJson(res, 201, { membershipId: output.membershipId, state: output.state });
}

async function activate(
  root: CompositionRoot,
  membershipId: string,
  body: Record<string, unknown>,
  res: ServerResponse,
) {
  const { actorUserId } = requireStrings(body, ['actorUserId']);
  await root.services.activateMembership.execute({ membershipId, actor: { userId: actorUserId } });
  sendJson(res, 200, { result: 'ACTIVATED' });
}

async function grant(
  root: CompositionRoot,
  membershipId: string,
  body: Record<string, unknown>,
  res: ServerResponse,
) {
  const { actorUserId, roleId } = requireStrings(body, ['actorUserId', 'roleId']);
  // The contract body carries no validity window: the Grant starts when the server receives it.
  const output = await root.services.grantRole.execute({
    membershipId,
    roleId,
    validFrom: new Date(),
    actor: { userId: actorUserId },
  });
  sendJson(res, 201, { grantId: output.grantId });
}

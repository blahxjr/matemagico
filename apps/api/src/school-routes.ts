import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CompositionRoot } from '@matemagico/composition-root';
import { authenticate } from './authentication-middleware';
import { authorize } from './authorization-middleware';
import { sendError } from './errors';
import { methodNotAllowed, parseParam, readBody, sendJson } from './http';
import { createSchoolBody } from './schemas';

const COLLECTION_PATH = '/schools';
const ITEM_PATH = /^\/schools\/([^/]+)$/;

/** Returns true when the request was a Schools route (handled or rejected). */
export function handleSchoolRoute(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): boolean {
  const item = ITEM_PATH.exec(path);
  if (path !== COLLECTION_PATH && !item) return false;

  const expected = item ? 'GET' : 'POST';
  if (req.method !== expected) {
    methodNotAllowed(res, expected);
    return true;
  }

  const run = async () => {
    if (!item) return create(root, req, res);
    return read(root, req, res, parseParam(item[1]));
  };
  void run().catch((error) => sendError(res, error, 'SCH-004'));
  return true;
}

/** Any authenticated User may found a School and becomes its first SCHOOL_ADMIN. */
async function create(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const actor = await authenticate(root, req);
  const body = await readBody(req, createSchoolBody);
  const school = await root.services.foundSchool.execute({
    founderUserId: actor.userId,
    name: body.name,
    slug: body.slug,
  });
  sendJson(res, 201, {
    schoolId: school.schoolId,
    name: school.name,
    slug: school.slug,
    status: school.status,
  });
}

/** Requires an ACTIVE Membership in the School with the `school:read` Permission. */
async function read(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  schoolId: string,
) {
  await authorize(root, req, { schoolId, action: 'school:read' });
  const school = await root.services.getSchool.execute({ schoolId });
  sendJson(res, 200, {
    schoolId: school.schoolId,
    name: school.name,
    slug: school.slug,
    status: school.status,
  });
}

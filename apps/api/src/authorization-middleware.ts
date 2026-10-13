import type { IncomingMessage } from 'node:http';
import { AuthError } from '@matemagico/auth';
import type { CompositionRoot, SessionActor } from '@matemagico/composition-root';
import { addLogContext } from '@matemagico/logger';
import { bearerToken } from './http';

/**
 * Authenticates the Session and requires `action` in `schoolId`: School Context (ACTIVE
 * Membership, ACTIVE User and School) and Permissions are resolved server-side from the actor.
 * Throws AUTH-003 (401) without a Session and SC-00x (403) without access.
 */
export async function authorize(
  root: CompositionRoot,
  req: IncomingMessage,
  requirement: { schoolId: string; action: string },
): Promise<SessionActor> {
  const token = bearerToken(req);
  if (!token) throw new AuthError('AUTH-003');
  const actor = await root.services.getSessionActor.execute({
    sessionId: token,
    school: requirement,
  });
  addLogContext({ schoolId: requirement.schoolId });
  return actor;
}

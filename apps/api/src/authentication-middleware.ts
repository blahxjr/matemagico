import type { IncomingMessage } from 'node:http';
import { AuthError } from '@matemagico/auth';
import type { CompositionRoot, SessionActor } from '@matemagico/composition-root';
import { bearerToken } from './http';

/**
 * Session -> Actor. The identity comes only from the Session token in the Authorization header,
 * validated by Auth; nothing in the body, query or path can name the actor.
 * Throws AUTH-003 (401) when there is no valid Session.
 */
export async function authenticate(
  root: CompositionRoot,
  req: IncomingMessage,
): Promise<SessionActor> {
  const token = bearerToken(req);
  if (!token) throw new AuthError('AUTH-003');
  return root.services.getSessionActor.execute({ sessionId: token });
}

import type { IncomingMessage } from 'node:http';
import type { CompositionRoot } from '@matemagico/composition-root';
import { authenticate } from './authentication-middleware';
import { authorize } from './authorization-middleware';

/**
 * Every reader is authenticated. A reader is an "author" (sees drafts, inactive topics and the
 * answer key) only when the Session proves `question:create` in the given School; otherwise
 * the request is treated as a plain reader of published content.
 */
export async function readerScope(
  root: CompositionRoot,
  req: IncomingMessage,
  schoolId: string | undefined,
): Promise<{ author: boolean }> {
  if (schoolId === undefined) {
    await authenticate(root, req);
    return { author: false };
  }
  await authorize(root, req, { schoolId, action: 'question:create' });
  return { author: true };
}

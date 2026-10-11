import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CompositionRoot } from '@matemagico/composition-root';
import { TopicsError } from '@matemagico/topics';
import { authenticate } from './authentication-middleware';
import { authorize } from './authorization-middleware';
import { sendError } from './errors';
import { methodNotAllowed, parseParam, readBody, readQuery, sendJson } from './http';
import { readerScope } from './reader-scope';
import { createTopicBody, topicGetQuery, topicListQuery, updateTopicBody } from './schemas';

const COLLECTION_PATH = '/topics';
const ITEM_PATH = /^\/topics\/([^/]+)$/;

/** Returns true when the request was a Topics route (handled or rejected). */
export function handleTopicRoute(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): boolean {
  const item = ITEM_PATH.exec(path);
  if (path !== COLLECTION_PATH && !item) return false;

  const allowed = item ? ['GET', 'PATCH'] : ['GET', 'POST'];
  if (!allowed.includes(req.method ?? '')) {
    methodNotAllowed(res, allowed.join(', '));
    return true;
  }

  const run = async () => {
    if (!item) return req.method === 'GET' ? list(root, req, res) : create(root, req, res);
    const topicId = parseParam(item[1]);
    return req.method === 'GET' ? read(root, req, res, topicId) : update(root, req, res, topicId);
  };
  void run().catch((error) => sendError(res, error, 'TOP-004'));
  return true;
}

async function list(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const query = readQuery(req, topicListQuery);
  const scope = await readerScope(root, req, query.schoolId);
  const items = await root.services.listTopics.execute({
    status: scope.author ? query.status : 'ACTIVE',
  });
  sendJson(res, 200, { items });
}

async function read(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  topicId: string,
) {
  const query = readQuery(req, topicGetQuery);
  const scope = await readerScope(root, req, query.schoolId);
  const topic = await root.services.getTopic.execute({ topicId });
  if (!scope.author && topic.status !== 'ACTIVE') throw new TopicsError('TOP-002');
  sendJson(res, 200, topic);
}

async function create(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  await authenticate(root, req);
  const body = await readBody(req, createTopicBody);
  await authorize(root, req, { schoolId: body.schoolId, action: 'question:create' });
  const topic = await root.services.createTopic.execute({
    name: body.name,
    slug: body.slug,
    description: body.description,
  });
  sendJson(res, 201, topic);
}

async function update(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  topicId: string,
) {
  await authenticate(root, req);
  const body = await readBody(req, updateTopicBody);
  await authorize(root, req, { schoolId: body.schoolId, action: 'question:update' });
  const hasFields = body.name !== undefined || body.description !== undefined;
  let topic =
    hasFields || body.status === undefined
      ? await root.services.updateTopic.execute({
          topicId,
          name: body.name,
          description: body.description,
        })
      : await root.services.getTopic.execute({ topicId });
  if (body.status === 'INACTIVE') {
    topic = await root.services.deactivateTopic.execute({ topicId });
  }
  sendJson(res, 200, topic);
}

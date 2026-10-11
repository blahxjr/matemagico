import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CompositionRoot } from '@matemagico/composition-root';
import { authenticate } from './authentication-middleware';
import { authorize } from './authorization-middleware';
import { sendError } from './errors';
import {
  InvalidBodyError,
  methodNotAllowed,
  parseParam,
  readBody,
  readQuery,
  sendJson,
} from './http';
import { readerScope } from './reader-scope';
import {
  createQuestionBody,
  questionActionBody,
  questionGetQuery,
  questionListQuery,
  versionQuestionBody,
} from './schemas';

const COLLECTION_PATH = '/questions';
const ITEM_PATH = /^\/questions\/([^/]+)$/;
const ACTION_PATH = /^\/questions\/([^/]+)\/(publish|archive|version)$/;

/** Returns true when the request was a Questions route (handled or rejected). */
export function handleQuestionRoute(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): boolean {
  const item = ITEM_PATH.exec(path);
  const action = ACTION_PATH.exec(path);
  if (path !== COLLECTION_PATH && !item && !action) return false;

  const allowed = action ? ['POST'] : item ? ['GET'] : ['GET', 'POST'];
  if (!allowed.includes(req.method ?? '')) {
    methodNotAllowed(res, allowed.join(', '));
    return true;
  }

  const run = async () => {
    if (action) {
      return act(
        root,
        req,
        res,
        parseParam(action[1]),
        action[2] as 'publish' | 'archive' | 'version',
      );
    }
    if (item) return read(root, req, res, parseParam(item[1]));
    return req.method === 'GET' ? list(root, req, res) : create(root, req, res);
  };
  void run().catch((error) => sendError(res, error, 'QST-006'));
  return true;
}

async function list(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const query = readQuery(req, questionListQuery);
  // Non-published views are only meaningful (and allowed) for authors in a School.
  if (query.schoolId === undefined && query.status !== undefined && query.status !== 'PUBLISHED') {
    throw new InvalidBodyError();
  }
  const scope = await readerScope(root, req, query.schoolId);
  const result = await root.services.listQuestions.execute({
    filter: {
      level: query.level,
      topicId: query.topicId,
      status: query.status,
      sourceYear: query.sourceYear,
    },
    limit: query.limit,
    offset: query.offset,
    scope,
  });
  sendJson(res, 200, result);
}

async function read(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  questionId: string,
) {
  const query = readQuery(req, questionGetQuery);
  const scope = await readerScope(root, req, query.schoolId);
  const question = await root.services.getQuestion.execute({
    questionId,
    version: query.version,
    scope,
  });
  sendJson(res, 200, question);
}

async function create(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  await authenticate(root, req);
  const { schoolId, ...content } = await readBody(req, createQuestionBody);
  await authorize(root, req, { schoolId, action: 'question:create' });
  sendJson(res, 201, await root.services.createQuestion.execute(content));
}

async function act(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  questionId: string,
  action: 'publish' | 'archive' | 'version',
) {
  await authenticate(root, req);
  if (action === 'version') {
    const { schoolId, ...content } = await readBody(req, versionQuestionBody);
    await authorize(root, req, { schoolId, action: 'question:update' });
    sendJson(res, 201, await root.services.versionQuestion.execute({ questionId, ...content }));
    return;
  }
  const { schoolId } = await readBody(req, questionActionBody);
  if (action === 'publish') {
    await authorize(root, req, { schoolId, action: 'question:publish' });
    sendJson(res, 200, await root.services.publishQuestion.execute({ questionId }));
  } else {
    await authorize(root, req, { schoolId, action: 'question:update' });
    sendJson(res, 200, await root.services.archiveQuestion.execute({ questionId }));
  }
}

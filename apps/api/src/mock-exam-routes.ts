import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CompositionRoot } from '@matemagico/composition-root';
import { authenticate } from './authentication-middleware';
import { authorize } from './authorization-middleware';
import { sendError } from './errors';
import { methodNotAllowed, parseParam, readBody, readQuery, sendJson } from './http';
import {
  createMockExamBody,
  mockExamActionBody,
  mockExamGetQuery,
  mockExamListQuery,
} from './schemas';

const COLLECTION_PATH = '/exams';
const ITEM_PATH = /^\/exams\/([^/]+)$/;
const ACTION_PATH = /^\/exams\/([^/]+)\/(publish|archive|start)$/;

export function handleMockExamRoute(
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
        action[2] as 'publish' | 'archive' | 'start',
      );
    }
    if (item) return get(root, req, res, parseParam(item[1]));
    return req.method === 'GET' ? list(root, req, res) : create(root, req, res);
  };
  void run().catch((error) => sendError(res, error, 'EXM-006'));
  return true;
}

async function list(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  const query = readQuery(req, mockExamListQuery);
  const includeDrafts = query.includeDrafts === 'true';
  await authorize(root, req, {
    schoolId: query.schoolId,
    action: includeDrafts ? 'exam:create' : 'school:read',
  });
  const items = await root.services.listMockExams.execute({
    schoolId: query.schoolId,
    ...(includeDrafts ? {} : { status: 'PUBLISHED', availableAt: new Date() }),
  });
  sendJson(res, 200, { items });
}

async function get(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  examId: string,
) {
  const query = readQuery(req, mockExamGetQuery);
  await authorize(root, req, { schoolId: query.schoolId, action: 'school:read' });
  const exam = await root.services.getMockExam.execute({ examId, schoolId: query.schoolId });
  if (exam.status !== 'PUBLISHED') {
    await authorize(root, req, { schoolId: query.schoolId, action: 'exam:create' });
  } else {
    const now = Date.now();
    const outsideWindow =
      (exam.availableFrom !== null && now < exam.availableFrom.getTime()) ||
      (exam.availableUntil !== null && now > exam.availableUntil.getTime());
    if (outsideWindow) {
      await authorize(root, req, { schoolId: query.schoolId, action: 'exam:create' });
    }
  }
  sendJson(res, 200, exam);
}

async function create(root: CompositionRoot, req: IncomingMessage, res: ServerResponse) {
  await authenticate(root, req);
  const body = await readBody(req, createMockExamBody);
  await authorize(root, req, { schoolId: body.schoolId, action: 'exam:create' });
  const exam = await root.services.createMockExam.execute({
    title: body.title,
    description: body.description,
    schoolId: body.schoolId,
    level: body.level,
    topicId: body.topicId,
    quantity: body.quantity,
    seed: body.seed,
    durationMinutes: body.durationMinutes,
    availableFrom: body.availableFrom ? new Date(body.availableFrom) : null,
    availableUntil: body.availableUntil ? new Date(body.availableUntil) : null,
  });
  sendJson(res, 201, exam);
}

async function act(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  examId: string,
  action: 'publish' | 'archive' | 'start',
) {
  await authenticate(root, req);
  const body = await readBody(req, mockExamActionBody);
  if (action === 'start') {
    await authorize(root, req, { schoolId: body.schoolId, action: 'school:read' });
    const result = await root.services.startExam.execute({ examId, schoolId: body.schoolId });
    sendJson(res, 200, result);
    return;
  }
  await authorize(root, req, { schoolId: body.schoolId, action: 'exam:publish' });
  const result =
    action === 'publish'
      ? await root.services.publishMockExam.execute({ examId, schoolId: body.schoolId })
      : await root.services.archiveMockExam.execute({ examId, schoolId: body.schoolId });
  sendJson(res, 200, result);
}

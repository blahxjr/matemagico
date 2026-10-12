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
  readBuffer,
  readQuery,
  sendJson,
} from './http';
import { readerScope } from './reader-scope';
import {
  createQuestionBody,
  editorialDashboardQuery,
  questionActionBody,
  questionGetQuery,
  questionListQuery,
  questionReviewQuery,
  rejectQuestionBody,
  updateQuestionBody,
  versionQuestionBody,
  xlsxImportHeaders,
} from './schemas';

const COLLECTION_PATH = '/questions';
const ITEM_PATH = /^\/questions\/([^/]+)$/;
const ACTION_PATH =
  /^\/questions\/([^/]+)\/(publish|archive|version|review|approve|reject|return-to-review)$/;
const REVIEW_PATH = '/questions/review';
const DASHBOARD_PATH = '/questions/editorial-dashboard';
const XLSX_IMPORT_PATH = '/questions/import/xlsx';

/** Returns true when the request was a Questions route (handled or rejected). */
export function handleQuestionRoute(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): boolean {
  const item = ITEM_PATH.exec(path);
  const action = ACTION_PATH.exec(path);
  const isReview = path === REVIEW_PATH;
  const isDashboard = path === DASHBOARD_PATH;
  const isXlsxImport = path === XLSX_IMPORT_PATH;
  if (path !== COLLECTION_PATH && !item && !action && !isReview && !isDashboard && !isXlsxImport) {
    return false;
  }

  const allowed = action || isXlsxImport ? ['POST'] : item ? ['GET', 'PATCH'] : ['GET'];
  if (path === COLLECTION_PATH) allowed.push('POST');
  if (!allowed.includes(req.method ?? '')) {
    methodNotAllowed(res, allowed.join(', '));
    return true;
  }

  const run = async () => {
    if (isXlsxImport) return importXlsx(root, req, res);
    if (isDashboard) return editorialDashboard(root, req, res);
    if (isReview) return reviewList(root, req, res);
    if (action) {
      return act(
        root,
        req,
        res,
        parseParam(action[1]),
        action[2] as
          'publish' | 'archive' | 'version' | 'review' | 'approve' | 'reject' | 'return-to-review',
      );
    }
    if (item)
      return req.method === 'GET'
        ? read(root, req, res, parseParam(item[1]))
        : update(root, req, res, parseParam(item[1]));
    return req.method === 'GET' ? list(root, req, res) : create(root, req, res);
  };
  void run().catch((error) => sendError(res, error, 'QST-006'));
  return true;
}

async function importXlsx(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await authenticate(root, req);
  const rawHeaders = {
    schoolId: req.headers['x-school-id'],
    fileName: req.headers['x-file-name'],
  };
  const headers = xlsxImportHeaders.safeParse({
    schoolId: typeof rawHeaders.schoolId === 'string' ? rawHeaders.schoolId : undefined,
    fileName: typeof rawHeaders.fileName === 'string' ? rawHeaders.fileName : undefined,
  });
  if (!headers.success) throw new InvalidBodyError();
  const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    throw new InvalidBodyError();
  }
  await authorize(root, req, { schoolId: headers.data.schoolId, action: 'question:create' });
  const report = await root.services.importQuestionsFromXlsx.execute({
    buffer: await readBuffer(req),
    fileName: headers.data.fileName,
  });
  sendJson(res, 200, report);
}

async function reviewList(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const query = readQuery(req, questionReviewQuery);
  await authorize(root, req, { schoolId: query.schoolId, action: 'question:update' });
  const result = await root.services.listQuestions.execute({
    filter: {
      status: query.status ?? 'IMPORTED',
      topicId: query.topicId,
      gradeLevel: query.gradeLevel,
      difficulty: query.difficulty,
      sourceType: query.sourceType,
    },
    limit: query.limit,
    offset: query.offset,
    scope: { author: true },
  });
  sendJson(res, 200, result);
}

async function editorialDashboard(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const query = readQuery(req, editorialDashboardQuery);
  await authorize(root, req, { schoolId: query.schoolId, action: 'question:update' });
  sendJson(res, 200, await root.services.editorialDashboard.execute());
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

async function update(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  questionId: string,
) {
  await authenticate(root, req);
  const { schoolId, ...content } = await readBody(req, updateQuestionBody);
  await authorize(root, req, { schoolId, action: 'question:update' });
  sendJson(res, 200, await root.services.updateQuestion.execute({ questionId, ...content }));
}

async function act(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  questionId: string,
  action: 'publish' | 'archive' | 'version' | 'review' | 'approve' | 'reject' | 'return-to-review',
) {
  await authenticate(root, req);
  if (action === 'version') {
    const { schoolId, ...content } = await readBody(req, versionQuestionBody);
    await authorize(root, req, { schoolId, action: 'question:update' });
    sendJson(res, 201, await root.services.versionQuestion.execute({ questionId, ...content }));
    return;
  }
  if (action === 'reject') {
    const { schoolId } = await readBody(req, rejectQuestionBody);
    await authorize(root, req, { schoolId, action: 'question:publish' });
    sendJson(res, 200, await root.services.rejectQuestion.execute({ questionId }));
    return;
  }
  const { schoolId } = await readBody(req, questionActionBody);
  if (action === 'publish') {
    await authorize(root, req, { schoolId, action: 'question:publish' });
    sendJson(res, 200, await root.services.publishQuestion.execute({ questionId }));
  } else if (action === 'archive') {
    await authorize(root, req, { schoolId, action: 'question:update' });
    sendJson(res, 200, await root.services.archiveQuestion.execute({ questionId }));
  } else if (action === 'review') {
    await authorize(root, req, { schoolId, action: 'question:update' });
    sendJson(res, 200, await root.services.startReview.execute({ questionId }));
  } else if (action === 'approve') {
    await authorize(root, req, { schoolId, action: 'question:publish' });
    sendJson(res, 200, await root.services.approveQuestion.execute({ questionId }));
  } else {
    await authorize(root, req, { schoolId, action: 'question:publish' });
    sendJson(res, 200, await root.services.returnToReview.execute({ questionId }));
  }
}

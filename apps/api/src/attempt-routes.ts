import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CompositionRoot } from '@matemagico/composition-root';
import { authenticate } from './authentication-middleware';
import { authorize } from './authorization-middleware';
import { sendError } from './errors';
import { methodNotAllowed, parseParam, readBody, readQuery, sendJson } from './http';
import {
  attemptActionBody,
  attemptGetQuery,
  attemptHistoryQuery,
  startAttemptBody,
  submitAnswerBody,
} from './schemas';
import { recordAudit } from './audit';

const START_FROM_EXAM = /^\/exams\/([^/]+)\/attempts$/;
const COLLECTION_PATH = '/attempts';
const HISTORY_PATH = '/attempts/history';
const ITEM_PATH = /^\/attempts\/([^/]+)$/;
const ACTION_PATH = /^\/attempts\/([^/]+)\/(answers|finish|expire)$/;

export function handleAttemptRoute(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): boolean {
  const startFromExam = START_FROM_EXAM.exec(path);
  const action = ACTION_PATH.exec(path);
  const isHistory = path === HISTORY_PATH;
  const isCollection = path === COLLECTION_PATH;
  const item = !isHistory && !isCollection && !action ? ITEM_PATH.exec(path) : null;

  if (!startFromExam && !action && !isHistory && !item && !isCollection) return false;

  if (startFromExam || action || isCollection) {
    if (req.method !== 'POST') {
      methodNotAllowed(res, 'POST');
      return true;
    }
  } else if (isHistory || item) {
    if (req.method !== 'GET') {
      methodNotAllowed(res, 'GET');
      return true;
    }
  }

  void (async () => {
    const actor = await authenticate(root, req);

    if (startFromExam || isCollection) {
      const body = await readBody(req, startAttemptBody);
      const examId = startFromExam ? parseParam(startFromExam[1]) : body.examId;
      if (!examId) {
        sendJson(res, 400, { error: { code: 'INVALID_REQUEST' } });
        return;
      }
      await authorize(root, req, { schoolId: body.schoolId, action: 'school:read' });
      sendJson(
        res,
        201,
        await root.services.startAttempt.execute({
          examId,
          schoolId: body.schoolId,
          userId: actor.userId,
        }),
      );
      return;
    }

    if (isHistory) {
      const query = readQuery(req, attemptHistoryQuery);
      await authorize(root, req, { schoolId: query.schoolId, action: 'school:read' });
      const items = await root.services.getAttemptHistory.execute({
        schoolId: query.schoolId,
        userId: actor.userId,
        examId: query.examId,
      });
      sendJson(res, 200, { items });
      return;
    }

    if (action) {
      const attemptId = parseParam(action[1]);
      const operation = action[2];
      if (operation === 'answers') {
        const body = await readBody(req, submitAnswerBody);
        await authorize(root, req, { schoolId: body.schoolId, action: 'school:read' });
        sendJson(
          res,
          200,
          await root.services.submitAnswer.execute({
            attemptId,
            schoolId: body.schoolId,
            userId: actor.userId,
            questionId: body.questionId,
            selectedOption: body.selectedOption,
          }),
        );
        return;
      }
      const body = await readBody(req, attemptActionBody);
      await authorize(root, req, { schoolId: body.schoolId, action: 'school:read' });
      const service =
        operation === 'finish' ? root.services.finishAttempt : root.services.expireAttempt;
      const finished = await service.execute({
        attemptId,
        schoolId: body.schoolId,
        userId: actor.userId,
      });
      if (operation === 'finish') {
        await recordAudit(root, {
          actorUserId: actor.userId,
          actorSchoolId: body.schoolId,
          action: 'attempt.finished',
          targetType: 'Attempt',
          targetId: attemptId,
        });
      }
      sendJson(res, 200, finished);
      return;
    }

    if (item) {
      const attemptId = parseParam(item[1]);
      const query = readQuery(req, attemptGetQuery);
      await authorize(root, req, { schoolId: query.schoolId, action: 'school:read' });
      const result = await root.services.getAttempt.execute({
        attemptId,
        schoolId: query.schoolId,
        userId: actor.userId,
      });
      sendJson(res, 200, result);
      return;
    }
  })().catch((error) => sendError(res, error, 'ATT-006'));

  return true;
}

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CompositionRoot } from '@matemagico/composition-root';
import { authenticate } from './authentication-middleware';
import { authorize } from './authorization-middleware';
import { sendError } from './errors';
import { methodNotAllowed, parseParam, readBody, sendJson } from './http';
import { attemptActionBody, startAttemptBody, submitAnswerBody } from './schemas';

const START = /^\/exams\/([^/]+)\/attempts$/;
const ACTION = /^\/attempts\/([^/]+)\/(answers|finish|expire)$/;

export function handleAttemptRoute(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): boolean {
  const start = START.exec(path);
  const action = ACTION.exec(path);
  if (!start && !action) return false;
  if (req.method !== 'POST') {
    methodNotAllowed(res, 'POST');
    return true;
  }
  void (async () => {
    const actor = await authenticate(root, req);
    if (start) {
      const body = await readBody(req, startAttemptBody);
      await authorize(root, req, { schoolId: body.schoolId, action: 'school:read' });
      sendJson(
        res,
        201,
        await root.services.startAttempt.execute({
          examId: parseParam(start[1]),
          schoolId: body.schoolId,
          userId: actor.userId,
        }),
      );
      return;
    }
    const attemptId = parseParam(action![1]);
    const operation = action![2];
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
    sendJson(
      res,
      200,
      await service.execute({ attemptId, schoolId: body.schoolId, userId: actor.userId }),
    );
  })().catch((error) => sendError(res, error, 'ATT-006'));
  return true;
}

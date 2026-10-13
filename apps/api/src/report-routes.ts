import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CompositionRoot } from '@matemagico/composition-root';
import { authenticate } from './authentication-middleware';
import { authorize } from './authorization-middleware';
import { sendError } from './errors';
import { methodNotAllowed, parseParam, readQuery, sendJson } from './http';
import { schoolScopedQuery } from './schemas';

const EXAM_RANKING = /^\/rankings\/exams\/([^/]+)$/;

/** Staff-only read models: rankings and performance (permission report:read). */
export function handleReportRoute(
  root: CompositionRoot,
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): boolean {
  const examRanking = EXAM_RANKING.exec(path);
  if (path !== '/rankings/school' && path !== '/performance/school' && !examRanking) return false;
  if (req.method !== 'GET') {
    methodNotAllowed(res, 'GET');
    return true;
  }

  void (async () => {
    await authenticate(root, req);
    const query = readQuery(req, schoolScopedQuery);
    await authorize(root, req, { schoolId: query.schoolId, action: 'report:read' });
    if (examRanking || path === '/rankings/school') {
      // Read-your-writes: deliver pending AttemptCompleted events before reading the projection.
      await root.services.attemptCompletedDispatcher.dispatchPending();
    }
    if (examRanking) {
      sendJson(
        res,
        200,
        await root.services.getExamRanking.execute({
          schoolId: query.schoolId,
          examId: parseParam(examRanking[1]),
        }),
      );
    } else if (path === '/rankings/school') {
      sendJson(
        res,
        200,
        await root.services.getSchoolRanking.execute({ schoolId: query.schoolId }),
      );
    } else {
      sendJson(
        res,
        200,
        await root.services.getSchoolPerformance.execute({ schoolId: query.schoolId }),
      );
    }
  })().catch((error) => sendError(res, error, 'ATT-006'));
  return true;
}

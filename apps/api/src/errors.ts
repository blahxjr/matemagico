import type { ServerResponse } from 'node:http';
import { AuthError } from '@matemagico/auth';
import { logger } from '@matemagico/logger';
import { MembershipError, SchoolContextError } from '@matemagico/membership';
import { SchoolsError } from '@matemagico/schools';
import { QuestionsError } from '@matemagico/questions';
import { TopicsError } from '@matemagico/topics';
import { MockExamsError } from '@matemagico/mock-exams';
import { QuestionEngineError } from '@matemagico/question-engine';
import { UsersError } from '@matemagico/users';
import { InvalidBodyError, sendJson } from './http';

/** Code returned when a dependency failure is not a known domain error (always fail closed). */
export type FallbackCode = 'AUTH-004' | 'MEM-005' | 'SCH-004' | 'TOP-004' | 'QST-006' | 'EXM-006';

interface Mapped {
  readonly status: number;
  readonly code: string;
}

const AUTH: Record<string, number> = {
  'AUTH-001': 401,
  'AUTH-002': 429,
  'AUTH-003': 401,
  'AUTH-004': 503,
  'AUTH-005': 400,
};
const MEMBERSHIP: Record<string, number> = {
  'MEM-001': 403,
  'MEM-002': 404,
  'MEM-003': 404,
  'MEM-004': 409,
};
const SCHOOL_CONTEXT: Record<string, number> = {
  'SC-001': 401,
  'SC-002': 403,
  'SC-003': 403,
  'SC-004': 403,
  'SC-005': 503,
};
const USERS: Record<string, number> = {
  'USR-001': 400,
  'USR-002': 404,
  'USR-003': 409,
  'USR-004': 503,
};
const SCHOOLS: Record<string, number> = {
  'SCH-001': 400,
  'SCH-002': 404,
  'SCH-003': 409,
  'SCH-004': 503,
  'SCH-005': 403,
};
const TOPICS: Record<string, number> = {
  'TOP-001': 400,
  'TOP-002': 404,
  'TOP-003': 409,
  'TOP-004': 503,
};
const QUESTIONS: Record<string, number> = {
  'QST-001': 400,
  'QST-002': 404,
  'QST-003': 409,
  'QST-004': 409,
  'QST-005': 409,
  'QST-006': 503,
  'QST-007': 400,
};
const MOCK_EXAMS: Record<string, number> = {
  'EXM-001': 400,
  'EXM-002': 404,
  'EXM-003': 409,
  'EXM-004': 400,
  'EXM-005': 409,
  'EXM-006': 503,
};
const QUESTION_ENGINE: Record<string, number> = {
  'QEN-001': 409,
  'QEN-002': 400,
  'QEN-003': 400,
};
const FALLBACK_STATUS: Record<FallbackCode, number> = {
  'AUTH-004': 503,
  'MEM-005': 503,
  'SCH-004': 503,
  'TOP-004': 503,
  'QST-006': 503,
  'EXM-006': 503,
};

function map(error: unknown, fallback: FallbackCode): Mapped {
  if (error instanceof InvalidBodyError) return { status: 400, code: 'INVALID_REQUEST' };
  if (error instanceof AuthError) return { status: AUTH[error.code]!, code: error.code };
  if (error instanceof MembershipError) {
    // MEM-005 is a 403 only for a real authorization decision; an unavailable authorizer is a 503.
    if (error.code === 'MEM-005') return { status: error.denied ? 403 : 503, code: error.code };
    return { status: MEMBERSHIP[error.code]!, code: error.code };
  }
  if (error instanceof SchoolContextError) {
    return { status: SCHOOL_CONTEXT[error.code]!, code: error.code };
  }
  if (error instanceof UsersError) return { status: USERS[error.code]!, code: error.code };
  if (error instanceof SchoolsError) return { status: SCHOOLS[error.code]!, code: error.code };
  if (error instanceof TopicsError) return { status: TOPICS[error.code]!, code: error.code };
  if (error instanceof QuestionsError) {
    return { status: QUESTIONS[error.code]!, code: error.code };
  }
  if (error instanceof MockExamsError) {
    return { status: MOCK_EXAMS[error.code]!, code: error.code };
  }
  if (error instanceof QuestionEngineError) {
    return { status: QUESTION_ENGINE[error.code]!, code: error.code };
  }
  return { status: FALLBACK_STATUS[fallback], code: fallback };
}

/** Sends a generic, code-only error; messages and payloads are never echoed or logged. */
export function sendError(res: ServerResponse, error: unknown, fallback: FallbackCode): void {
  const { status, code } = map(error, fallback);
  const context = {
    errorCode: code,
    errorName: error instanceof Error ? error.name : 'UnknownError',
  };
  if (status >= 500) logger.error('api.request.failed', context);
  else logger.warn('api.request.failed', context);
  sendJson(
    res,
    status,
    { error: { code } },
    status === 401 ? { 'www-authenticate': 'Bearer' } : {},
  );
}

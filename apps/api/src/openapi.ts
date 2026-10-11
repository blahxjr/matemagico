import { z } from 'zod';
import {
  activateMembershipBody,
  createMembershipBody,
  createMockExamBody,
  createQuestionBody,
  createSchoolBody,
  createTopicBody,
  errorResponse,
  grantCreatedResponse,
  grantRoleBody,
  loginBody,
  logoutResponse,
  meResponse,
  membershipActivatedResponse,
  membershipCreatedResponse,
  questionActionBody,
  questionGetQuery,
  questionListQuery,
  questionListResponse,
  questionResponse,
  mockExamActionBody,
  mockExamGetQuery,
  mockExamListQuery,
  mockExamListResponse,
  mockExamResponse,
  registerBody,
  registerResponse,
  schoolResponse,
  sessionResponse,
  startExamResponse,
  topicGetQuery,
  topicListQuery,
  topicListResponse,
  topicResponse,
  updateTopicBody,
  versionQuestionBody,
} from './schemas';

const json = (schema: z.ZodType) => ({
  'application/json': { schema: z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) },
});

const errors = (...codes: Array<[number, string]>) =>
  Object.fromEntries(
    codes.map(([status, description]) => [
      String(status),
      { description, content: json(errorResponse) },
    ]),
  );

const secured = [{ sessionToken: [] }];

/** Query parameters derived from a strict Zod query schema. */
const queryParams = (schema: z.ZodObject) =>
  Object.entries(schema.shape).map(([name, field]) => ({
    name,
    in: 'query',
    required: false,
    schema: z.toJSONSchema(field as z.ZodType, { io: 'input', unrepresentable: 'any' }),
  }));
const idParam = (name: string) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
});

/** OpenAPI 3.1 document generated from the same Zod contracts used for validation. */
export function buildOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'MateMágico Champions API',
      version: '0.1.0',
      description:
        'Identity is derived only from the Session (Authorization: Bearer). No route accepts an actor identifier. Errors: AUTH-001..005, MEM-001..005, SC-001..005 (plus USR/SCH codes).',
    },
    components: {
      securitySchemes: {
        sessionToken: {
          type: 'http',
          scheme: 'bearer',
          description: 'Opaque Session id from /auth/login',
        },
      },
    },
    paths: {
      '/auth/register': {
        post: {
          summary: 'Register a User',
          requestBody: { required: true, content: json(registerBody) },
          responses: {
            '201': { description: 'Created', content: json(registerResponse) },
            ...errors(
              [400, 'INVALID_REQUEST'],
              [409, 'USR-003'],
              [429, 'AUTH-002'],
              [503, 'AUTH-004'],
            ),
          },
        },
      },
      '/auth/login': {
        post: {
          summary: 'Authenticate and open a Session',
          requestBody: { required: true, content: json(loginBody) },
          responses: {
            '200': { description: 'Authenticated', content: json(sessionResponse) },
            ...errors([400, 'AUTH-005'], [401, 'AUTH-001'], [429, 'AUTH-002'], [503, 'AUTH-004']),
          },
        },
      },
      '/auth/logout': {
        post: {
          summary: 'Revoke the current Session',
          security: secured,
          responses: {
            '200': { description: 'Revoked', content: json(logoutResponse) },
            ...errors([401, 'AUTH-003'], [503, 'AUTH-004']),
          },
        },
      },
      '/auth/me': {
        get: {
          summary: 'Authenticated profile',
          security: secured,
          responses: {
            '200': { description: 'Profile', content: json(meResponse) },
            ...errors([401, 'AUTH-003'], [503, 'AUTH-004']),
          },
        },
      },
      '/memberships': {
        post: {
          summary: 'Create a Membership (requires membership:create)',
          security: secured,
          requestBody: { required: true, content: json(createMembershipBody) },
          responses: {
            '201': { description: 'Created', content: json(membershipCreatedResponse) },
            ...errors(
              [400, 'INVALID_REQUEST'],
              [401, 'AUTH-003'],
              [403, 'MEM-001 / MEM-005'],
              [404, 'MEM-002 / MEM-003'],
              [409, 'MEM-004'],
              [503, 'MEM-005'],
            ),
          },
        },
      },
      '/memberships/{membershipId}/activate': {
        post: {
          summary: 'Activate a Membership (canActivateMembership)',
          security: secured,
          parameters: [idParam('membershipId')],
          requestBody: { required: false, content: json(activateMembershipBody) },
          responses: {
            '200': { description: 'Activated', content: json(membershipActivatedResponse) },
            ...errors([401, 'AUTH-003'], [403, 'MEM-005'], [404, 'MEM-003'], [409, 'MEM-004']),
          },
        },
      },
      '/memberships/{membershipId}/grants': {
        post: {
          summary: 'Grant a Role (canGrantRole)',
          security: secured,
          parameters: [idParam('membershipId')],
          requestBody: { required: true, content: json(grantRoleBody) },
          responses: {
            '201': { description: 'Granted', content: json(grantCreatedResponse) },
            ...errors(
              [400, 'INVALID_REQUEST'],
              [401, 'AUTH-003'],
              [403, 'MEM-005'],
              [404, 'MEM-003'],
              [409, 'MEM-004'],
            ),
          },
        },
      },
      '/schools': {
        post: {
          summary: 'Create a School; the creator becomes SCHOOL_ADMIN',
          security: secured,
          requestBody: { required: true, content: json(createSchoolBody) },
          responses: {
            '201': { description: 'Created', content: json(schoolResponse) },
            ...errors([400, 'INVALID_REQUEST / SCH-001'], [401, 'AUTH-003'], [409, 'SCH-003']),
          },
        },
      },
      '/schools/{schoolId}': {
        get: {
          summary: 'Read a School (requires school:read in it)',
          security: secured,
          parameters: [idParam('schoolId')],
          responses: {
            '200': { description: 'School', content: json(schoolResponse) },
            ...errors(
              [401, 'AUTH-003 / SC-001'],
              [403, 'SC-002 / SC-003 / SC-004'],
              [404, 'SCH-002'],
            ),
          },
        },
      },
      '/topics': {
        get: {
          summary:
            'List topics (ACTIVE only; with schoolId and question:create, any status is allowed)',
          security: secured,
          parameters: [...queryParams(topicListQuery)],
          responses: {
            '200': { description: 'Topics', content: json(topicListResponse) },
            ...errors([400, 'INVALID_REQUEST'], [401, 'AUTH-003'], [403, 'SC-002..004']),
          },
        },
        post: {
          summary: 'Create a topic (requires question:create in schoolId)',
          security: secured,
          requestBody: { required: true, content: json(createTopicBody) },
          responses: {
            '201': { description: 'Created', content: json(topicResponse) },
            ...errors(
              [400, 'INVALID_REQUEST / TOP-001'],
              [401, 'AUTH-003'],
              [403, 'SC-002..004'],
              [409, 'TOP-003'],
            ),
          },
        },
      },
      '/topics/{topicId}': {
        get: {
          summary: 'Read a topic',
          security: secured,
          parameters: [idParam('topicId'), ...queryParams(topicGetQuery)],
          responses: {
            '200': { description: 'Topic', content: json(topicResponse) },
            ...errors([401, 'AUTH-003'], [403, 'SC-002..004'], [404, 'TOP-002']),
          },
        },
        patch: {
          summary: 'Update or deactivate a topic (requires question:update in schoolId)',
          security: secured,
          parameters: [idParam('topicId')],
          requestBody: { required: true, content: json(updateTopicBody) },
          responses: {
            '200': { description: 'Updated', content: json(topicResponse) },
            ...errors(
              [400, 'INVALID_REQUEST / TOP-001'],
              [401, 'AUTH-003'],
              [403, 'SC-002..004'],
              [404, 'TOP-002'],
            ),
          },
        },
      },
      '/questions': {
        get: {
          summary:
            'List questions with filters (readers see PUBLISHED without the answer key; authors pass schoolId)',
          security: secured,
          parameters: [...queryParams(questionListQuery)],
          responses: {
            '200': { description: 'Page of questions', content: json(questionListResponse) },
            ...errors([400, 'INVALID_REQUEST / QST-001'], [401, 'AUTH-003'], [403, 'SC-002..004']),
          },
        },
        post: {
          summary: 'Create a DRAFT question (requires question:create in schoolId)',
          security: secured,
          requestBody: { required: true, content: json(createQuestionBody) },
          responses: {
            '201': { description: 'Created', content: json(questionResponse) },
            ...errors(
              [400, 'INVALID_REQUEST / QST-001'],
              [401, 'AUTH-003'],
              [403, 'SC-002..004'],
              [409, 'QST-003'],
            ),
          },
        },
      },
      '/questions/{questionId}': {
        get: {
          summary: 'Read a question (published version for readers; any version for authors)',
          security: secured,
          parameters: [idParam('questionId'), ...queryParams(questionGetQuery)],
          responses: {
            '200': { description: 'Question', content: json(questionResponse) },
            ...errors([401, 'AUTH-003'], [403, 'SC-002..004'], [404, 'QST-002']),
          },
        },
      },
      '/questions/{questionId}/publish': {
        post: {
          summary: 'Publish the current DRAFT (requires question:publish in schoolId)',
          security: secured,
          parameters: [idParam('questionId')],
          requestBody: { required: true, content: json(questionActionBody) },
          responses: {
            '200': { description: 'Published', content: json(questionResponse) },
            ...errors(
              [401, 'AUTH-003'],
              [403, 'SC-002..004'],
              [404, 'QST-002'],
              [409, 'QST-003 / QST-005'],
            ),
          },
        },
      },
      '/questions/{questionId}/archive': {
        post: {
          summary: 'Archive the published (or draft) version (requires question:update)',
          security: secured,
          parameters: [idParam('questionId')],
          requestBody: { required: true, content: json(questionActionBody) },
          responses: {
            '200': { description: 'Archived', content: json(questionResponse) },
            ...errors([401, 'AUTH-003'], [403, 'SC-002..004'], [404, 'QST-002'], [409, 'QST-005']),
          },
        },
      },
      '/questions/{questionId}/version': {
        post: {
          summary: 'Create version N+1 as a DRAFT; published versions are never mutated',
          security: secured,
          parameters: [idParam('questionId')],
          requestBody: { required: true, content: json(versionQuestionBody) },
          responses: {
            '201': { description: 'New version', content: json(questionResponse) },
            ...errors(
              [400, 'INVALID_REQUEST / QST-001'],
              [401, 'AUTH-003'],
              [403, 'SC-002..004'],
              [404, 'QST-002'],
              [409, 'QST-003 / QST-004'],
            ),
          },
        },
      },
      '/exams': {
        get: {
          summary: 'List available published exams; requires school:read and schoolId',
          security: secured,
          parameters: [...queryParams(mockExamListQuery)],
          responses: {
            '200': { description: 'Mock exams', content: json(mockExamListResponse) },
            ...errors([400, 'INVALID_REQUEST'], [401, 'AUTH-003'], [403, 'SC-002..004']),
          },
        },
        post: {
          summary: 'Create a draft exam with deterministic question selection (exam:create)',
          security: secured,
          requestBody: { required: true, content: json(createMockExamBody) },
          responses: {
            '201': { description: 'Created', content: json(mockExamResponse) },
            ...errors(
              [400, 'INVALID_REQUEST / EXM-001 / EXM-004 / QEN-002'],
              [401, 'AUTH-003'],
              [403, 'SC-002..004'],
              [409, 'QEN-001 / QEN-003'],
            ),
          },
        },
      },
      '/exams/{examId}': {
        get: {
          summary: 'Get an exam in the authenticated school context',
          security: secured,
          parameters: [idParam('examId'), ...queryParams(mockExamGetQuery)],
          responses: {
            '200': { description: 'Mock exam', content: json(mockExamResponse) },
            ...errors(
              [400, 'INVALID_REQUEST'],
              [401, 'AUTH-003'],
              [403, 'SC-002..004'],
              [404, 'EXM-002'],
            ),
          },
        },
      },
      '/exams/{examId}/publish': {
        post: {
          summary: 'Publish an exam (requires exam:publish)',
          security: secured,
          parameters: [idParam('examId')],
          requestBody: { required: true, content: json(mockExamActionBody) },
          responses: {
            '200': { description: 'Published', content: json(mockExamResponse) },
            ...errors([401, 'AUTH-003'], [403, 'SC-002..004'], [404, 'EXM-002'], [409, 'EXM-003']),
          },
        },
      },
      '/exams/{examId}/archive': {
        post: {
          summary: 'Archive a published exam (requires exam:publish)',
          security: secured,
          parameters: [idParam('examId')],
          requestBody: { required: true, content: json(mockExamActionBody) },
          responses: {
            '200': { description: 'Archived', content: json(mockExamResponse) },
            ...errors([401, 'AUTH-003'], [403, 'SC-002..004'], [404, 'EXM-002'], [409, 'EXM-003']),
          },
        },
      },
      '/exams/{examId}/start': {
        post: {
          summary: 'Start an available published exam (school:read); does not create an Attempt',
          security: secured,
          parameters: [idParam('examId')],
          requestBody: { required: true, content: json(mockExamActionBody) },
          responses: {
            '200': {
              description: 'Exam questions without answer keys',
              content: json(startExamResponse),
            },
            ...errors([401, 'AUTH-003'], [403, 'SC-002..004'], [404, 'EXM-002'], [409, 'EXM-005']),
          },
        },
      },
    },
  };
}

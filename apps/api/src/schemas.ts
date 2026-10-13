import { z } from 'zod';
import { QUESTION_LEVELS, QUESTION_STATUSES } from '@matemagico/questions';
import { MOCK_EXAM_STATUSES } from '@matemagico/mock-exams';

/** Every request body is a strict object: unknown keys such as `actorUserId` fail validation. */
const strict = <T extends z.ZodRawShape>(shape: T) => z.strictObject(shape);

export const idSchema = z.string().trim().min(1).max(128);

export const registerBody = strict({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(12).max(128),
});

export const loginBody = strict({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
});

export const createMembershipBody = strict({ userId: idSchema, schoolId: idSchema });
export const activateMembershipBody = strict({});
export const grantRoleBody = strict({ roleId: idSchema });
export const createSchoolBody = strict({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(80),
});

export const errorResponse = strict({ error: strict({ code: z.string() }) });
export const sessionResponse = strict({
  result: z.literal('AUTHENTICATED'),
  sessionId: z.string(),
});
export const registerResponse = strict({ userId: z.string(), email: z.string(), name: z.string() });
export const logoutResponse = strict({ result: z.literal('REVOKED') });
export const meResponse = strict({
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  roles: z.array(z.string()),
  schools: z.array(
    strict({
      schoolId: z.string(),
      name: z.string(),
      slug: z.string(),
      membershipId: z.string(),
      roles: z.array(z.string()),
    }),
  ),
});
export const deactivateMeResponse = strict({ result: z.literal('DEACTIVATED') });
export const membershipCreatedResponse = strict({
  membershipId: z.string(),
  state: z.literal('PENDING'),
});
export const membershipActivatedResponse = strict({ result: z.literal('ACTIVATED') });
export const grantCreatedResponse = strict({ grantId: z.string() });
export const schoolResponse = strict({
  schoolId: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

// ---- Topics & Questions -------------------------------------------------------------------
// `schoolId` in write bodies is the School Context the permission is checked in, never identity.

const slugSchema = z.string().trim().min(1).max(80);
const intQuery = z
  .string()
  .regex(/^\d{1,9}$/)
  .transform(Number);

export const createTopicBody = strict({
  schoolId: idSchema,
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  description: z.string().trim().max(1000).optional(),
});
export const updateTopicBody = strict({
  schoolId: idSchema,
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.literal('INACTIVE').optional(),
});
export const topicListQuery = strict({
  schoolId: idSchema.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export const topicGetQuery = strict({ schoolId: idSchema.optional() });

const optionBody = strict({
  label: z.enum(['A', 'B', 'C', 'D', 'E']),
  content: z.string().trim().min(1).max(1000),
  isCorrect: z.boolean(),
});
const questionContent = {
  title: z.string().trim().min(1).max(200),
  statement: z.string().trim().min(1).max(5000),
  level: z.enum(QUESTION_LEVELS),
  topicId: idSchema,
  sourceName: z.string().trim().min(1).max(120),
  sourceYear: z.number().int().min(1900).max(2100).nullable().optional(),
  sourceReference: z.string().trim().max(200).nullable().optional(),
  sourceNotes: z.string().trim().max(2000).nullable().optional(),
  options: z.array(optionBody).min(2).max(5),
  sourceType: z.enum(['OLYMPIAD', 'EXAM', 'BOOK', 'INTERNAL', 'UNKNOWN']).optional(),
  legacyId: z.string().trim().max(128).nullable().optional(),
  authorName: z.string().trim().min(1).max(200).optional(),
  authorType: z.enum(['AUTHOR', 'ORGANIZATION', 'UNKNOWN']).optional(),
  authorVerified: z.boolean().optional(),
  gradeLevel: z.string().trim().max(50).nullable().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).nullable().optional(),
  explanation: z.string().trim().max(10000).nullable().optional(),
  imageUrl: z.string().trim().url().max(2048).nullable().optional(),
  imageStatus: z.enum(['PENDING', 'VALID', 'BROKEN', 'MISSING']).optional(),
  imageHash: z.string().trim().max(128).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
};
export const createQuestionBody = strict({ schoolId: idSchema, ...questionContent });
export const versionQuestionBody = strict({ schoolId: idSchema, ...questionContent });
export const questionActionBody = strict({ schoolId: idSchema });
export const rejectQuestionBody = strict({
  schoolId: idSchema,
  reason: z.string().trim().min(1).max(2000),
});
export const updateQuestionBody = strict({ schoolId: idSchema, ...questionContent });
export const xlsxImportHeaders = strict({
  schoolId: idSchema,
  fileName: z.string().trim().min(1).max(255).optional(),
});
export const questionReviewQuery = strict({
  schoolId: idSchema,
  status: z.enum(QUESTION_STATUSES).optional(),
  topicId: idSchema.optional(),
  gradeLevel: z.string().trim().min(1).max(50).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  sourceType: z.enum(['OLYMPIAD', 'EXAM', 'BOOK', 'INTERNAL', 'UNKNOWN']).optional(),
  limit: intQuery.optional(),
  offset: intQuery.optional(),
});
export const editorialDashboardQuery = strict({ schoolId: idSchema });
export const questionListQuery = strict({
  schoolId: idSchema.optional(),
  level: z.enum(QUESTION_LEVELS).optional(),
  topicId: idSchema.optional(),
  status: z.enum(QUESTION_STATUSES).optional(),
  sourceYear: intQuery.optional(),
  limit: intQuery.optional(),
  offset: intQuery.optional(),
});
export const questionGetQuery = strict({
  schoolId: idSchema.optional(),
  version: intQuery.optional(),
});

export const topicResponse = strict({
  topicId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const topicListResponse = strict({ items: z.array(topicResponse) });
export const questionResponse = strict({
  questionId: z.string(),
  version: z.number().int(),
  title: z.string(),
  statement: z.string(),
  level: z.enum(QUESTION_LEVELS).nullable(),
  status: z.enum(QUESTION_STATUSES),
  topicId: z.string(),
  sourceName: z.string(),
  sourceYear: z.number().int().nullable(),
  sourceReference: z.string().nullable(),
  sourceNotes: z.string().nullable(),
  sourceType: z.enum(['OLYMPIAD', 'EXAM', 'BOOK', 'INTERNAL', 'UNKNOWN']),
  legacyId: z.string().nullable(),
  authorName: z.string(),
  authorType: z.enum(['AUTHOR', 'ORGANIZATION', 'UNKNOWN']),
  authorVerified: z.boolean(),
  gradeLevel: z.string().nullable(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).nullable(),
  explanation: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageStatus: z.enum(['PENDING', 'VALID', 'BROKEN', 'MISSING']),
  imageHash: z.string().nullable(),
  tags: z.array(z.string()),
  options: z.array(
    strict({
      optionId: z.string(),
      label: z.string(),
      content: z.string(),
      isCorrect: z.boolean().optional(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
});
export const questionListResponse = strict({
  items: z.array(questionResponse),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export const editorialDashboardResponse = strict({
  imported: z.number().int(),
  inReview: z.number().int(),
  approved: z.number().int(),
  published: z.number().int(),
  rejected: z.number().int(),
  duplicates: z.number().int(),
});

// ---- Mock Exams --------------------------------------------------------------------------
const dateTime = z.iso.datetime({ offset: true });
export const createMockExamBody = strict({
  schoolId: idSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  level: z.enum(QUESTION_LEVELS),
  topicId: idSchema,
  quantity: z.number().int().min(1).max(100),
  seed: z.string().trim().min(1).max(128),
  durationMinutes: z.number().int().positive(),
  availableFrom: dateTime.nullable().optional(),
  availableUntil: dateTime.nullable().optional(),
});
export const mockExamActionBody = strict({ schoolId: idSchema });
export const mockExamListQuery = strict({
  schoolId: idSchema,
  includeDrafts: z.enum(['true', 'false']).optional(),
});
export const mockExamGetQuery = strict({ schoolId: idSchema });
export const updateMockExamBody = strict({
  schoolId: idSchema,
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  durationMinutes: z.number().int().positive().optional(),
  availableFrom: dateTime.nullable().optional(),
  availableUntil: dateTime.nullable().optional(),
});

export const schoolScopedQuery = strict({ schoolId: idSchema });
export const membersResponse = strict({
  items: z.array(
    strict({
      membershipId: z.string(),
      userId: z.string(),
      name: z.string(),
      email: z.string(),
      state: z.string(),
      roles: z.array(z.string()),
    }),
  ),
});
const rankingItem = strict({
  position: z.number().int().positive(),
  studentId: z.string(),
  score: z.number(),
  correctAnswers: z.number().int(),
  timeSpentSeconds: z.number().int(),
  completedAt: z.string(),
  attempts: z.number().int(),
});
export const rankingResponse = strict({ items: z.array(rankingItem) });
export const performanceResponse = strict({
  students: z.array(
    strict({
      studentId: z.string(),
      attempts: z.number().int(),
      averageScore: z.number(),
      lastScore: z.number(),
      lastAttemptAt: z.string().nullable(),
    }),
  ),
  topics: z.array(
    strict({
      topicId: z.string(),
      correctAnswers: z.number().int(),
      wrongAnswers: z.number().int(),
      percentage: z.number(),
    }),
  ),
});
export const mockExamResponse = strict({
  examId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  schoolId: z.string(),
  level: z.enum(QUESTION_LEVELS),
  status: z.enum(MOCK_EXAM_STATUSES),
  durationMinutes: z.number().int(),
  availableFrom: z.string().nullable(),
  availableUntil: z.string().nullable(),
  questions: z.array(
    strict({
      questionId: z.string(),
      questionVersion: z.number().int(),
      position: z.number().int(),
      title: z.string(),
      statement: z.string(),
      level: z.enum(QUESTION_LEVELS),
      difficulty: z.string().nullable().optional(),
      gradeLevel: z.string().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
      options: z.array(strict({ label: z.string(), content: z.string() })),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
});
export const mockExamListResponse = strict({ items: z.array(mockExamResponse) });
export const startExamResponse = strict({
  examId: z.string(),
  title: z.string(),
  questions: mockExamResponse.shape.questions,
});

// ---- Attempts -----------------------------------------------------------------------------
export const startAttemptBody = strict({ schoolId: idSchema, examId: idSchema.optional() });
export const submitAnswerBody = strict({
  schoolId: idSchema,
  questionId: idSchema,
  selectedOption: z.enum(['A', 'B', 'C', 'D', 'E']),
});
export const attemptActionBody = strict({ schoolId: idSchema });
const attemptQuestionResponse = strict({
  questionId: z.string(),
  questionVersion: z.number().int(),
  position: z.number().int(),
  topicId: z.string(),
  title: z.string(),
  statement: z.string(),
  level: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  gradeLevel: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  /** Only present once the attempt is finished. */
  correctOption: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  options: z.array(strict({ label: z.string(), content: z.string() })),
});
export const attemptResponse = strict({
  attemptId: z.string(),
  schoolId: z.string(),
  userId: z.string(),
  examId: z.string(),
  title: z.string(),
  status: z.enum(['IN_PROGRESS', 'SUBMITTED', 'EXPIRED']),
  startedAt: z.string(),
  expiresAt: z.string(),
  submittedAt: z.string().nullable(),
  questions: z.array(attemptQuestionResponse),
  answers: z.array(
    strict({
      questionId: z.string(),
      questionVersion: z.number().int(),
      selectedOption: z.string(),
      answeredAt: z.string(),
    }),
  ),
  result: strict({
    score: z.number(),
    correctAnswers: z.number().int(),
    wrongAnswers: z.number().int(),
    totalQuestions: z.number().int(),
    percentage: z.number(),
    topicResults: z.record(
      z.string(),
      strict({
        correctAnswers: z.number().int(),
        wrongAnswers: z.number().int(),
        totalQuestions: z.number().int(),
        percentage: z.number(),
      }),
    ),
    difficultyResults: z.record(
      z.string(),
      strict({
        correctAnswers: z.number().int(),
        wrongAnswers: z.number().int(),
        totalQuestions: z.number().int(),
        percentage: z.number(),
      }),
    ),
    gradeLevelResults: z.record(
      z.string(),
      strict({
        correctAnswers: z.number().int(),
        wrongAnswers: z.number().int(),
        totalQuestions: z.number().int(),
        percentage: z.number(),
      }),
    ),
  }).nullable(),
});
export const attemptGetQuery = strict({
  schoolId: idSchema,
});
export const attemptHistoryQuery = strict({
  schoolId: idSchema,
  examId: idSchema.optional(),
});
export const attemptHistoryResponse = strict({
  items: z.array(attemptResponse),
});
export const meExportResponse = strict({
  profile: meResponse,
  memberships: z.array(
    strict({
      membershipId: z.string(),
      schoolId: z.string(),
      state: z.enum(['PENDING', 'ACTIVE', 'REVOKED']),
      createdAt: z.string(),
      activatedAt: z.string().nullable(),
      revokedAt: z.string().nullable(),
    }),
  ),
  attempts: z.array(attemptResponse),
});

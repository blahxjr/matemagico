import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createMembership,
  databaseUrl,
  ensureRoles,
  foundSchool,
  getJson,
  postJson,
  signUp,
  startApp,
  type App,
  type TestUser,
} from './test-support';

describe.skipIf(!databaseUrl)('attempts API', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  let app: App;
  let admin: TestUser;
  let teacher: TestUser;
  let student: TestUser;
  let student2: TestUser;
  let schoolId: string;
  let examId: string;
  let topicId: string;
  const enroll = async (user: TestUser, roleId: string) => {
    const membershipId = await createMembership(app, admin, user.userId, schoolId);
    await postJson(`${app.url}/memberships/${membershipId}/activate`, {}, false, admin.token);
    await postJson(`${app.url}/memberships/${membershipId}/grants`, { roleId }, false, admin.token);
  };
  beforeAll(async () => {
    await ensureRoles(prisma);
    app = await startApp(prisma);
    admin = await signUp(app, 'attempt-admin');
    teacher = await signUp(app, 'attempt-teacher');
    student = await signUp(app, 'attempt-student');
    student2 = await signUp(app, 'attempt-student-2');
    schoolId = await foundSchool(app, admin);
    await enroll(teacher, 'TEACHER');
    await enroll(student, 'STUDENT');
    await enroll(student2, 'STUDENT');
    const topic = await postJson(
      `${app.url}/topics`,
      { schoolId, name: 'Aritmética', slug: `attempt-${randomUUID().slice(0, 8)}` },
      false,
      teacher.token,
    );
    topicId = ((await topic.json()) as { topicId: string }).topicId;
    const question = await postJson(
      `${app.url}/questions`,
      {
        schoolId,
        title: 'Soma',
        statement: '2 + 2?',
        level: 'OBMEP_N1',
        topicId,
        sourceName: 'MOCK',
        sourceReference: randomUUID(),
        sourceType: 'INTERNAL',
        authorName: 'MateMágico',
        explanation: '2 mais 2 é 4.',
        options: [
          { label: 'A', content: '3', isCorrect: false },
          { label: 'B', content: '4', isCorrect: true },
        ],
      },
      false,
      teacher.token,
    );
    const { questionId } = (await question.json()) as { questionId: string };
    for (const action of ['review', 'approve', 'publish'])
      expect(
        (
          await postJson(
            `${app.url}/questions/${questionId}/${action}`,
            { schoolId },
            false,
            teacher.token,
          )
        ).status,
      ).toBe(200);
    const exam = await postJson(
      `${app.url}/exams`,
      {
        schoolId,
        title: 'Simulado',
        level: 'OBMEP_N1',
        topicId,
        quantity: 1,
        seed: randomUUID(),
        durationMinutes: 30,
      },
      false,
      teacher.token,
    );
    examId = ((await exam.json()) as { examId: string }).examId;
    expect(
      (await postJson(`${app.url}/exams/${examId}/publish`, { schoolId }, false, teacher.token))
        .status,
    ).toBe(200);
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
  it('starts, idempotently resumes, corrects and persists an attempt', async () => {
    const start = await postJson(
      `${app.url}/exams/${examId}/attempts`,
      { schoolId },
      false,
      student.token,
    );
    expect(start.status).toBe(201);
    const attempt = (await start.json()) as {
      attemptId: string;
      questions: { questionId: string; options: { isCorrect?: boolean }[] }[];
    };
    expect(attempt.questions[0]?.options.every((option) => option.isCorrect === undefined)).toBe(
      true,
    );
    const repeated = await postJson(
      `${app.url}/exams/${examId}/attempts`,
      { schoolId },
      false,
      student.token,
    );
    expect(((await repeated.json()) as { attemptId: string }).attemptId).toBe(attempt.attemptId);
    expect(
      (
        await postJson(
          `${app.url}/attempts/${attempt.attemptId}/answers`,
          { schoolId, questionId: attempt.questions[0]!.questionId, selectedOption: 'B' },
          false,
          student.token,
        )
      ).status,
    ).toBe(200);
    const finish = await postJson(
      `${app.url}/attempts/${attempt.attemptId}/finish`,
      { schoolId },
      false,
      student.token,
    );
    expect(finish.status).toBe(200);
    expect(
      await prisma.auditEvent.count({
        where: {
          actorUserId: student.userId,
          actorSchoolId: schoolId,
          action: 'attempt.finished',
          targetId: attempt.attemptId,
        },
      }),
    ).toBe(1);
    expect(await finish.json()).toMatchObject({
      status: 'SUBMITTED',
      result: {
        score: 100,
        percentage: 100,
        correctAnswers: 1,
        wrongAnswers: 0,
        totalQuestions: 1,
        topicResults: {
          [topicId]: { correctAnswers: 1, wrongAnswers: 0, totalQuestions: 1, percentage: 100 },
        },
        difficultyResults: {
          MEDIUM: { correctAnswers: 1, wrongAnswers: 0, totalQuestions: 1, percentage: 100 },
        },
        gradeLevelResults: {
          OBMEP_N1: { correctAnswers: 1, wrongAnswers: 0, totalQuestions: 1, percentage: 100 },
        },
      },
    });
    const stored = await prisma.attempt.findUniqueOrThrow({
      where: { attemptId: attempt.attemptId },
      include: { answers: true },
    });
    expect(stored.completedEvent).toMatchObject({
      eventName: 'AttemptCompleted',
      aggregateId: attempt.attemptId,
      aggregateType: 'Attempt',
      schemaVersion: 1,
      correlationId: attempt.attemptId,
      causationId: attempt.attemptId,
      schoolId,
      payload: {
        attemptId: attempt.attemptId,
        examId,
        userId: student.userId,
        schoolId,
        score: 100,
        correctAnswers: 1,
        timeSpentSeconds: expect.any(Number),
      },
    });
    expect(stored.answers).toHaveLength(1);

    // GET /attempts/:id - student can view own attempt
    const getSelf = await getJson(
      `${app.url}/attempts/${attempt.attemptId}?schoolId=${schoolId}`,
      student.token,
    );
    expect(getSelf.status).toBe(200);
    const selfData = (await getSelf.json()) as {
      attemptId: string;
      status: string;
      questions: unknown[];
    };
    expect(selfData.attemptId).toBe(attempt.attemptId);
    expect(selfData.status).toBe('SUBMITTED');
    expect(selfData).toMatchObject({
      questions: [{ correctOption: 'B', explanation: '2 mais 2 é 4.', imageUrl: null }],
    });
    expect(
      (attempt.questions[0] as { correctOption?: string; explanation?: string }).correctOption,
    ).toBeUndefined();
    expect(
      (attempt.questions[0] as { correctOption?: string; explanation?: string }).explanation,
    ).toBeUndefined();

    // Security isolation: other student cannot view this attempt
    const getOther = await getJson(
      `${app.url}/attempts/${attempt.attemptId}?schoolId=${schoolId}`,
      student2.token,
    );
    expect(getOther.status).toBe(404);

    // GET /attempts/history
    const history1 = await getJson(
      `${app.url}/attempts/history?schoolId=${schoolId}`,
      student.token,
    );
    expect(history1.status).toBe(200);
    const histData1 = (await history1.json()) as { items: { attemptId: string }[] };
    expect(histData1.items.some((item) => item.attemptId === attempt.attemptId)).toBe(true);

    const history2 = await getJson(
      `${app.url}/attempts/history?schoolId=${schoolId}`,
      student2.token,
    );
    expect(history2.status).toBe(200);
    const histData2 = (await history2.json()) as { items: { attemptId: string }[] };
    expect(histData2.items.some((item) => item.attemptId === attempt.attemptId)).toBe(false);
  });

  it('expires an active attempt and records EXPIRED status', async () => {
    const start = await postJson(`${app.url}/attempts`, { schoolId, examId }, false, student.token);
    expect(start.status).toBe(201);
    const attempt = (await start.json()) as { attemptId: string };
    const expire = await postJson(
      `${app.url}/attempts/${attempt.attemptId}/expire`,
      { schoolId },
      false,
      student.token,
    );
    expect(expire.status).toBe(200);
    const expiredData = (await expire.json()) as { status: string; result: { score: number } };
    expect(expiredData.status).toBe('EXPIRED');
    expect(expiredData.result.score).toBe(0);
  });
});

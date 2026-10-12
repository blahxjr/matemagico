import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createMembership,
  databaseUrl,
  ensureRoles,
  foundSchool,
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
  let schoolId: string;
  let examId: string;
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
    schoolId = await foundSchool(app, admin);
    await enroll(teacher, 'TEACHER');
    await enroll(student, 'STUDENT');
    const topic = await postJson(
      `${app.url}/topics`,
      { schoolId, name: 'Aritmética', slug: `attempt-${randomUUID().slice(0, 8)}` },
      false,
      teacher.token,
    );
    const topicId = ((await topic.json()) as { topicId: string }).topicId;
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
    expect(await finish.json()).toMatchObject({
      status: 'SUBMITTED',
      result: { score: 100, percentage: 100, correctAnswers: 1 },
    });
    const stored = await prisma.attempt.findUniqueOrThrow({
      where: { attemptId: attempt.attemptId },
      include: { answers: true },
    });
    expect(stored.completedEvent).toMatchObject({ eventName: 'AttemptCompleted' });
    expect(stored.answers).toHaveLength(1);
  });
});

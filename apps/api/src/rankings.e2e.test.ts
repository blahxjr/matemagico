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

type Item = { studentId: string; score: number; position: number };

describe.skipIf(!databaseUrl)('rankings, performance and administration API', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  let app: App;
  let admin: TestUser;
  let teacher: TestUser;
  let student: TestUser;
  let student2: TestUser;
  let schoolId: string;
  let examId: string;
  let topicId: string;
  const memberships = new Map<string, string>();

  const enroll = async (user: TestUser, roleId: string) => {
    const membershipId = await createMembership(app, admin, user.userId, schoolId);
    memberships.set(user.userId, membershipId);
    await postJson(`${app.url}/memberships/${membershipId}/activate`, {}, false, admin.token);
    await postJson(`${app.url}/memberships/${membershipId}/grants`, { roleId }, false, admin.token);
  };
  const takeExam = async (user: TestUser, option: string) => {
    const start = await postJson(
      `${app.url}/exams/${examId}/attempts`,
      { schoolId },
      false,
      user.token,
    );
    const attempt = (await start.json()) as {
      attemptId: string;
      questions: { questionId: string }[];
    };
    await postJson(
      `${app.url}/attempts/${attempt.attemptId}/answers`,
      { schoolId, questionId: attempt.questions[0]!.questionId, selectedOption: option },
      false,
      user.token,
    );
    const finish = await postJson(
      `${app.url}/attempts/${attempt.attemptId}/finish`,
      { schoolId },
      false,
      user.token,
    );
    expect(finish.status).toBe(200);
  };
  const createExam = async () => {
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
    expect(exam.status).toBe(201);
    return ((await exam.json()) as { examId: string }).examId;
  };

  beforeAll(async () => {
    await ensureRoles(prisma);
    app = await startApp(prisma);
    admin = await signUp(app, 'rank-admin');
    teacher = await signUp(app, 'rank-teacher');
    student = await signUp(app, 'rank-student');
    student2 = await signUp(app, 'rank-student-2');
    schoolId = await foundSchool(app, admin);
    await enroll(teacher, 'TEACHER');
    await enroll(student, 'STUDENT');
    await enroll(student2, 'STUDENT');
    const topic = await postJson(
      `${app.url}/topics`,
      { schoolId, name: 'Aritmética', slug: `rank-${randomUUID().slice(0, 8)}` },
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
    for (const action of ['review', 'approve', 'publish']) {
      await postJson(
        `${app.url}/questions/${questionId}/${action}`,
        { schoolId },
        false,
        teacher.token,
      );
    }
    examId = await createExam();
    expect(
      (await postJson(`${app.url}/exams/${examId}/publish`, { schoolId }, false, teacher.token))
        .status,
    ).toBe(200);
    await takeExam(student, 'B');
    await takeExam(student2, 'A');
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('projects AttemptCompleted into the school and exam rankings', async () => {
    for (const url of [
      `${app.url}/rankings/school?schoolId=${schoolId}`,
      `${app.url}/rankings/exams/${examId}?schoolId=${schoolId}`,
    ]) {
      const response = await getJson(url, admin.token);
      expect(response.status).toBe(200);
      const { items } = (await response.json()) as { items: Item[] };
      expect(items.map((item) => [item.studentId, item.score, item.position])).toEqual([
        [student.userId, 100, 1],
        [student2.userId, 0, 2],
      ]);
    }
    const teacherView = await getJson(
      `${app.url}/rankings/exams/${examId}?schoolId=${schoolId}`,
      teacher.token,
    );
    expect(teacherView.status).toBe(200);
  });

  it('is idempotent when the outbox is redelivered', async () => {
    const before = await prisma.rankingEntry.count({ where: { schoolId } });
    await prisma.rankingEntry.deleteMany({ where: { schoolId, studentId: student.userId } });
    await app.root.services.attemptCompletedDispatcher.dispatchPending();
    await app.root.services.attemptCompletedDispatcher.dispatchPending();
    expect(await prisma.rankingEntry.count({ where: { schoolId } })).toBe(before);
  });

  it('denies rankings and performance to students and anonymous callers', async () => {
    for (const path of [
      `/rankings/school?schoolId=${schoolId}`,
      `/rankings/exams/${examId}?schoolId=${schoolId}`,
      `/performance/school?schoolId=${schoolId}`,
    ]) {
      expect((await getJson(`${app.url}${path}`, student.token)).status).toBe(403);
      expect((await getJson(`${app.url}${path}`)).status).toBe(401);
    }
  });

  it('aggregates performance per student and per topic', async () => {
    const response = await getJson(
      `${app.url}/performance/school?schoolId=${schoolId}`,
      teacher.token,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      students: { studentId: string; averageScore: number; attempts: number }[];
      topics: {
        topicId: string;
        correctAnswers: number;
        wrongAnswers: number;
        percentage: number;
      }[];
    };
    expect(body.students.find((s) => s.studentId === student.userId)).toMatchObject({
      averageScore: 100,
      attempts: 1,
    });
    expect(body.topics).toEqual([{ topicId, correctAnswers: 1, wrongAnswers: 1, percentage: 50 }]);
  });

  it('lists members with state and roles for SCHOOL_ADMIN only', async () => {
    const response = await getJson(`${app.url}/memberships?schoolId=${schoolId}`, admin.token);
    expect(response.status).toBe(200);
    const { items } = (await response.json()) as {
      items: { userId: string; state: string; roles: string[]; email: string }[];
    };
    expect(items.find((item) => item.userId === teacher.userId)).toMatchObject({
      state: 'ACTIVE',
      roles: ['TEACHER'],
    });
    expect(
      (await getJson(`${app.url}/memberships?schoolId=${schoolId}`, teacher.token)).status,
    ).toBe(403);
  });

  it('edits an exam only while it is a draft', async () => {
    const draftId = await createExam();
    const patch = (id: string) =>
      fetch(`${app.url}/exams/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${teacher.token}` },
        body: JSON.stringify({ schoolId, title: 'Novo título', durationMinutes: 45 }),
      });
    const edited = await patch(draftId);
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({ title: 'Novo título', durationMinutes: 45 });
    await postJson(`${app.url}/exams/${draftId}/publish`, { schoolId }, false, teacher.token);
    expect((await patch(draftId)).status).toBe(409);
  });
});

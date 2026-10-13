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

const bearer = (token: string) => ['Bearer', token].join(' ');
const options = [
  { label: 'A', content: '3', isCorrect: false },
  { label: 'B', content: '4', isCorrect: true },
];

describe.skipIf(!databaseUrl)('mock exams API', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  let app: App;
  let admin: TestUser;
  let teacher: TestUser;
  let student: TestUser;
  let outsider: TestUser;
  let schoolId: string;
  let topicId: string;
  let questionId: string;

  const enroll = async (user: TestUser, roleId: string) => {
    const membershipId = await createMembership(app, admin, user.userId, schoolId);
    expect(
      (await postJson(`${app.url}/memberships/${membershipId}/activate`, {}, false, admin.token))
        .status,
    ).toBe(200);
    expect(
      (
        await postJson(
          `${app.url}/memberships/${membershipId}/grants`,
          { roleId },
          false,
          admin.token,
        )
      ).status,
    ).toBe(201);
  };

  const createQuestion = async () => {
    const created = await postJson(
      `${app.url}/questions`,
      {
        schoolId,
        title: 'Soma simples',
        statement: 'Quanto é 2 + 2?',
        level: 'OBMEP_N1',
        topicId,
        sourceName: 'MOCK',
        sourceType: 'INTERNAL',
        sourceReference: `exam-${randomUUID()}`,
        explanation: 'Some os valores indicados.',
        options,
      },
      false,
      teacher.token,
    );
    expect(created.status).toBe(201);
    const question = (await created.json()) as { questionId: string };
    questionId = question.questionId;
    for (const action of ['review', 'approve', 'publish']) {
      const transitioned = await postJson(
        `${app.url}/questions/${questionId}/${action}`,
        { schoolId },
        false,
        teacher.token,
      );
      expect(transitioned.status).toBe(200);
    }
  };

  const createExam = async (overrides: Record<string, unknown> = {}) =>
    postJson(
      `${app.url}/exams`,
      {
        schoolId,
        title: 'Simulado de aritmética',
        description: 'Prova de teste',
        level: 'OBMEP_N1',
        topicId,
        quantity: 1,
        seed: 'stable-seed',
        durationMinutes: 30,
        ...overrides,
      },
      false,
      teacher.token,
    );

  beforeAll(async () => {
    await ensureRoles(prisma);
    app = await startApp(prisma);
    admin = await signUp(app, 'exam-admin');
    teacher = await signUp(app, 'exam-teacher');
    student = await signUp(app, 'exam-student');
    outsider = await signUp(app, 'exam-outsider');
    schoolId = await foundSchool(app, admin);
    await enroll(teacher, 'TEACHER');
    await enroll(student, 'STUDENT');
    const topic = await postJson(
      `${app.url}/topics`,
      { schoolId, name: 'Aritmética', slug: `arithmetic-${randomUUID().slice(0, 8)}` },
      false,
      teacher.token,
    );
    expect(topic.status).toBe(201);
    topicId = ((await topic.json()) as { topicId: string }).topicId;
    await createQuestion();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('creates, publishes and starts an exam without exposing the answer key', async () => {
    const created = await createExam();
    expect(created.status).toBe(201);
    const draft = (await created.json()) as {
      examId: string;
      status: string;
      questions: { questionVersion: number }[];
    };
    expect(draft.status).toBe('DRAFT');
    expect(draft.questions[0]?.questionVersion).toBe(1);
    const sameSeed = await createExam({ title: 'Mesmo seed' });
    expect(sameSeed.status).toBe(201);
    const repeated = (await sameSeed.json()) as {
      questions: { questionId: string; questionVersion: number }[];
    };
    expect(repeated.questions).toEqual(draft.questions);
    const edited = await fetch(`${app.url}/exams/${draft.examId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: bearer(teacher.token) },
      body: JSON.stringify({ schoolId, title: 'Alterado' }),
    });
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({ title: 'Alterado', status: 'DRAFT' });

    const publish = await postJson(
      `${app.url}/exams/${draft.examId}/publish`,
      { schoolId },
      false,
      teacher.token,
    );
    expect(publish.status).toBe(200);
    const audit = await prisma.auditEvent.findMany({
      where: {
        actorUserId: teacher.userId,
        actorSchoolId: schoolId,
        targetType: 'MockExam',
        targetId: draft.examId,
      },
      select: { action: true },
    });
    expect(audit.map(({ action }) => action)).toEqual(
      expect.arrayContaining(['exam.created', 'exam.updated', 'exam.published']),
    );
    const attemptedEditAfterPublish = await fetch(`${app.url}/exams/${draft.examId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: bearer(teacher.token) },
      body: JSON.stringify({ schoolId, title: 'Não alterável' }),
    });
    expect(attemptedEditAfterPublish.status).toBe(409);

    const start = await postJson(
      `${app.url}/exams/${draft.examId}/start`,
      { schoolId },
      false,
      student.token,
    );
    expect(start.status).toBe(200);
    const started = (await start.json()) as {
      questions: { questionVersion: number; options: Record<string, unknown>[] }[];
    };
    expect(started.questions[0]?.questionVersion).toBe(1);
    expect(started.questions[0]?.options[0]).not.toHaveProperty('isCorrect');

    const version = await postJson(
      `${app.url}/questions/${questionId}/version`,
      {
        schoolId,
        title: 'Soma atualizada',
        statement: 'Quanto é 3 + 1?',
        level: 'OBMEP_N1',
        topicId,
        sourceName: 'MOCK',
        sourceType: 'INTERNAL',
        sourceReference: `version-${randomUUID()}`,
        explanation: 'A soma continua igual.',
        options,
      },
      false,
      teacher.token,
    );
    expect(version.status).toBe(201);
    for (const action of ['review', 'approve', 'publish']) {
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
    }

    const startAgain = await postJson(
      `${app.url}/exams/${draft.examId}/start`,
      { schoolId },
      false,
      student.token,
    );
    const frozen = (await startAgain.json()) as {
      questions: { questionVersion: number; title: string }[];
    };
    expect(frozen.questions[0]).toMatchObject({ questionVersion: 1, title: 'Soma simples' });
  });

  it('enforces deterministic composition inputs, available windows and read permissions', async () => {
    expect(
      (
        await createExam({
          quantity: 2,
          title: 'Sem questões suficientes',
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await createExam({
          availableFrom: '2026-10-12T00:00:00.000Z',
          availableUntil: '2026-10-11T00:00:00.000Z',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await postJson(
          `${app.url}/exams`,
          {
            schoolId,
            title: 'Simulado sem permissão',
            level: 'OBMEP_N1',
            topicId,
            quantity: 1,
            seed: 's',
            durationMinutes: 10,
          },
          false,
          student.token,
        )
      ).status,
    ).toBe(403);
    expect(
      (await getJson(`${app.url}/exams?schoolId=${encodeURIComponent(schoolId)}`, outsider.token))
        .status,
    ).toBe(403);
    expect(
      (
        await postJson(
          `${app.url}/exams/not-a-real-exam/start`,
          { schoolId },
          false,
          outsider.token,
        )
      ).status,
    ).toBe(403);
  });

  it('rejects student start before an exam becomes available', async () => {
    const created = await createExam({
      title: 'Simulado futuro',
      availableFrom: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(created.status).toBe(201);
    const { examId } = (await created.json()) as { examId: string };
    expect(
      (await postJson(`${app.url}/exams/${examId}/publish`, { schoolId }, false, teacher.token))
        .status,
    ).toBe(200);
    const start = await postJson(
      `${app.url}/exams/${examId}/start`,
      { schoolId },
      false,
      student.token,
    );
    expect(start.status).toBe(409);
    expect(await start.json()).toMatchObject({ error: { code: 'EXM-005' } });
  });

  it('lists available published exams and rejects invalid durations', async () => {
    const list = await getJson(
      `${app.url}/exams?schoolId=${encodeURIComponent(schoolId)}`,
      student.token,
    );
    expect(list.status).toBe(200);
    const body = (await list.json()) as { items: { status: string }[] };
    expect(body.items.every((item) => item.status === 'PUBLISHED')).toBe(true);
    expect((await createExam({ durationMinutes: 0 })).status).toBe(400);
  });
});

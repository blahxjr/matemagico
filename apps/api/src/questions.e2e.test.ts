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

const patchJson = (url: string, body: unknown, token?: string) =>
  fetch(url, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: bearer(token) } : {}),
    },
    body: JSON.stringify(body),
  });
const bearer = (token: string) => ['Bearer', token].join(' ');

const options = [
  { label: 'A', content: '3', isCorrect: false },
  { label: 'B', content: '4', isCorrect: true },
  { label: 'C', content: '5', isCorrect: false },
];

describe.skipIf(!databaseUrl)('topics & questions API', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  let app: App;
  let admin: TestUser;
  let teacher: TestUser;
  let student: TestUser;
  let schoolId: string;
  let topicId: string;

  const enroll = async (user: TestUser, roleId: string) => {
    const membershipId = await createMembership(app, admin, user.userId, schoolId);
    const activate = await postJson(
      `${app.url}/memberships/${membershipId}/activate`,
      {},
      false,
      admin.token,
    );
    expect(activate.status).toBe(200);
    const grant = await postJson(
      `${app.url}/memberships/${membershipId}/grants`,
      { roleId },
      false,
      admin.token,
    );
    expect(grant.status).toBe(201);
  };

  const questionBody = (overrides: Record<string, unknown> = {}) => ({
    schoolId,
    title: 'Soma simples',
    statement: 'Quanto é 2 + 2?',
    level: 'OBMEP_N1',
    topicId,
    sourceName: 'MOCK',
    sourceYear: 2024,
    sourceReference: `Q-${randomUUID().slice(0, 6)}`,
    options,
    ...overrides,
  });

  const createQuestion = async (overrides: Record<string, unknown> = {}) => {
    const res = await postJson(
      `${app.url}/questions`,
      questionBody(overrides),
      false,
      teacher.token,
    );
    expect(res.status).toBe(201);
    return (await res.json()) as { questionId: string; version: number; status: string };
  };
  const publish = (questionId: string) =>
    postJson(`${app.url}/questions/${questionId}/publish`, { schoolId }, false, teacher.token);

  beforeAll(async () => {
    await ensureRoles(prisma);
    app = await startApp(prisma);
    admin = await signUp(app, 'admin');
    teacher = await signUp(app, 'professor');
    student = await signUp(app, 'aluno');
    schoolId = await foundSchool(app, admin);
    await enroll(teacher, 'TEACHER');
    await enroll(student, 'STUDENT');
    const res = await postJson(
      `${app.url}/topics`,
      { schoolId, name: 'Aritmética', slug: `aritmetica-${randomUUID().slice(0, 8)}` },
      false,
      teacher.token,
    );
    expect(res.status).toBe(201);
    topicId = ((await res.json()) as { topicId: string }).topicId;
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('every route requires a Session (401)', async () => {
    expect((await getJson(`${app.url}/topics`)).status).toBe(401);
    expect((await getJson(`${app.url}/topics/${topicId}`)).status).toBe(401);
    expect((await postJson(`${app.url}/topics`, {})).status).toBe(401);
    expect((await patchJson(`${app.url}/topics/${topicId}`, {})).status).toBe(401);
    expect((await getJson(`${app.url}/questions`)).status).toBe(401);
    expect((await getJson(`${app.url}/questions/x`)).status).toBe(401);
    expect((await postJson(`${app.url}/questions`, {})).status).toBe(401);
    for (const action of ['publish', 'archive', 'version']) {
      expect((await postJson(`${app.url}/questions/x/${action}`, {})).status).toBe(401);
    }
  });

  it('students and outsiders cannot write (403); teachers and admins can', async () => {
    const outsider = await signUp(app, 'fora');
    for (const user of [student, outsider]) {
      const t = await postJson(
        `${app.url}/topics`,
        { schoolId, name: 'X', slug: 'x-t' },
        false,
        user.token,
      );
      expect(t.status).toBe(403);
      const q = await postJson(`${app.url}/questions`, questionBody(), false, user.token);
      expect(q.status).toBe(403);
      const p = await patchJson(
        `${app.url}/topics/${topicId}`,
        { schoolId, name: 'Y' },
        user.token,
      );
      expect(p.status).toBe(403);
    }
    const draft = await createQuestion();
    for (const action of ['publish', 'archive']) {
      const res = await postJson(
        `${app.url}/questions/${draft.questionId}/${action}`,
        { schoolId },
        false,
        student.token,
      );
      expect(res.status).toBe(403);
    }
    const version = await postJson(
      `${app.url}/questions/${draft.questionId}/version`,
      questionBody(),
      false,
      student.token,
    );
    expect(version.status).toBe(403);

    const asAdmin = await postJson(`${app.url}/questions`, questionBody(), false, admin.token);
    expect(asAdmin.status).toBe(201);
  });

  it('forged identity is rejected in body and query', async () => {
    const body = await postJson(
      `${app.url}/questions`,
      { ...questionBody(), actorUserId: admin.userId },
      false,
      student.token,
    );
    expect(body.status).toBe(400);
    expect(
      (await getJson(`${app.url}/questions?actorUserId=${admin.userId}`, student.token)).status,
    ).toBe(400);
    expect((await getJson(`${app.url}/topics?actorUserId=x`, student.token)).status).toBe(400);
    expect((await getJson(`${app.url}/questions?limit=1&limit=2`, student.token)).status).toBe(400);
  });

  it('readers see only PUBLISHED questions, never the answer key', async () => {
    const q = await createQuestion({ title: 'Rascunho' });
    const list = async (query: string, token = student.token) =>
      (await (await getJson(`${app.url}/questions?topicId=${topicId}${query}`, token)).json()) as {
        items: { questionId: string; options: { isCorrect?: boolean }[] }[];
        total: number;
      };

    expect((await list('')).items.some((i) => i.questionId === q.questionId)).toBe(false);
    expect((await getJson(`${app.url}/questions/${q.questionId}`, student.token)).status).toBe(404);
    expect((await getJson(`${app.url}/questions?status=DRAFT`, student.token)).status).toBe(400);

    expect((await publish(q.questionId)).status).toBe(200);
    const seen = (await list('')).items.find((i) => i.questionId === q.questionId);
    expect(seen).toBeDefined();
    expect(seen!.options.every((o) => o.isCorrect === undefined)).toBe(true);
    const one = await getJson(`${app.url}/questions/${q.questionId}`, student.token);
    expect(one.status).toBe(200);
    expect(JSON.stringify(await one.json())).not.toContain('isCorrect');

    // A student cannot pose as an author by naming the School.
    const posing = await getJson(
      `${app.url}/questions?schoolId=${schoolId}&status=DRAFT`,
      student.token,
    );
    expect(posing.status).toBe(403);
  });

  it('authors see drafts and the answer key', async () => {
    const q = await createQuestion({ title: 'Só autor' });
    const res = await getJson(
      `${app.url}/questions/${q.questionId}?schoolId=${schoolId}`,
      teacher.token,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; options: { isCorrect: boolean }[] };
    expect(body.status).toBe('DRAFT');
    expect(body.options.some((o) => o.isCorrect)).toBe(true);
  });

  it('filters by level, topic, status and sourceYear, with pagination', async () => {
    const t2 = await postJson(
      `${app.url}/topics`,
      { schoolId, name: 'Geometria', slug: `geo-${randomUUID().slice(0, 8)}` },
      false,
      teacher.token,
    );
    const otherTopic = ((await t2.json()) as { topicId: string }).topicId;
    const a = await createQuestion({ topicId: otherTopic, level: 'OBMEP_N3', sourceYear: 2019 });
    await createQuestion({ topicId: otherTopic, level: 'OBMEP_N2', sourceYear: 2020 });
    await publish(a.questionId);

    const query = async (qs: string) =>
      (await (
        await getJson(
          `${app.url}/questions?schoolId=${schoolId}&topicId=${otherTopic}${qs}`,
          teacher.token,
        )
      ).json()) as { total: number; items: unknown[] };
    expect((await query('')).total).toBe(2);
    expect((await query('&level=OBMEP_N3')).total).toBe(1);
    expect((await query('&status=PUBLISHED')).total).toBe(1);
    expect((await query('&status=DRAFT')).total).toBe(1);
    expect((await query('&sourceYear=2020')).total).toBe(1);
    expect((await query('&limit=1')).items).toHaveLength(1);
    expect((await getJson(`${app.url}/questions?level=NOPE`, student.token)).status).toBe(400);
    expect((await getJson(`${app.url}/questions?limit=1000`, student.token)).status).toBe(400);
  });

  it('versions: published stays immutable, v2 is a DRAFT, publishing v2 archives v1', async () => {
    const q = await createQuestion({ title: 'Original' });
    expect((await publish(q.questionId)).status).toBe(200);
    expect((await publish(q.questionId)).status).toBe(409);

    const v2 = await postJson(
      `${app.url}/questions/${q.questionId}/version`,
      questionBody({ title: 'Revisada' }),
      false,
      teacher.token,
    );
    expect(v2.status).toBe(201);
    expect(await v2.json()).toMatchObject({ version: 2, status: 'DRAFT', title: 'Revisada' });

    const live = await getJson(`${app.url}/questions/${q.questionId}`, student.token);
    expect(await live.json()).toMatchObject({ version: 1, title: 'Original', status: 'PUBLISHED' });

    expect((await publish(q.questionId)).status).toBe(200);
    const liveAfter = await getJson(`${app.url}/questions/${q.questionId}`, student.token);
    expect(await liveAfter.json()).toMatchObject({ version: 2, title: 'Revisada' });
    const v1 = await getJson(
      `${app.url}/questions/${q.questionId}?schoolId=${schoolId}&version=1`,
      teacher.token,
    );
    expect(await v1.json()).toMatchObject({ version: 1, status: 'ARCHIVED', title: 'Original' });
    // Archived v1 is not visible to readers either.
    expect(
      (await getJson(`${app.url}/questions/${q.questionId}?version=1`, student.token)).status,
    ).toBe(404);
  });

  it('archive hides the question from readers and cannot repeat', async () => {
    const q = await createQuestion();
    await publish(q.questionId);
    const archive = () =>
      postJson(`${app.url}/questions/${q.questionId}/archive`, { schoolId }, false, teacher.token);
    expect((await archive()).status).toBe(200);
    expect((await archive()).status).toBe(409);
    expect((await getJson(`${app.url}/questions/${q.questionId}`, student.token)).status).toBe(404);
  });

  it('validates content and topic', async () => {
    const send = (overrides: Record<string, unknown>) =>
      postJson(`${app.url}/questions`, questionBody(overrides), false, teacher.token);
    expect((await send({ level: 'OBMEP_X' })).status).toBe(400);
    expect((await send({ options: [options[0]] })).status).toBe(400);
    expect((await send({ options: options.map((o) => ({ ...o, isCorrect: true })) })).status).toBe(
      400,
    );
    const unknownTopic = await send({ topicId: 'nao-existe' });
    expect(unknownTopic.status).toBe(409);
    expect(await unknownTopic.json()).toEqual({ error: { code: 'QST-003' } });
    expect(
      (await getJson(`${app.url}/questions/inexistente?schoolId=${schoolId}`, teacher.token))
        .status,
    ).toBe(404);
  });

  it('topics: duplicate slug 409, readers see ACTIVE only, deactivation blocks new questions', async () => {
    const slug = `dup-${randomUUID().slice(0, 8)}`;
    const create = () =>
      postJson(`${app.url}/topics`, { schoolId, name: 'Dup', slug }, false, teacher.token);
    const first = await create();
    expect(first.status).toBe(201);
    expect((await create()).status).toBe(409);
    const { topicId: id } = (await first.json()) as { topicId: string };

    const patched = await patchJson(
      `${app.url}/topics/${id}`,
      { schoolId, name: 'Dup 2' },
      teacher.token,
    );
    expect(await patched.json()).toMatchObject({ name: 'Dup 2', status: 'ACTIVE' });
    expect((await getJson(`${app.url}/topics/${id}`, student.token)).status).toBe(200);

    const off = await patchJson(
      `${app.url}/topics/${id}`,
      { schoolId, status: 'INACTIVE' },
      teacher.token,
    );
    expect(await off.json()).toMatchObject({ status: 'INACTIVE' });
    expect((await getJson(`${app.url}/topics/${id}`, student.token)).status).toBe(404);
    expect(
      (await getJson(`${app.url}/topics/${id}?schoolId=${schoolId}`, teacher.token)).status,
    ).toBe(200);
    const listed = (await (await getJson(`${app.url}/topics`, student.token)).json()) as {
      items: { topicId: string }[];
    };
    expect(listed.items.some((t) => t.topicId === id)).toBe(false);

    const blocked = await postJson(
      `${app.url}/questions`,
      questionBody({ topicId: id }),
      false,
      teacher.token,
    );
    expect(blocked.status).toBe(409);
    expect(
      (await patchJson(`${app.url}/topics/${id}`, { schoolId, actorUserId: 'x' }, teacher.token))
        .status,
    ).toBe(400);
  });
});

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
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

function xlsxWorkbook(rows: Record<string, unknown>[]): Buffer {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'BANCO_QUESTOES_V11');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

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
    sourceType: 'OLYMPIAD',
    sourceYear: 2024,
    sourceReference: `Q-${randomUUID().slice(0, 6)}`,
    explanation: 'Some as parcelas e obtenha o resultado.',
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
  const startReview = (questionId: string, token = teacher.token) =>
    postJson(`${app.url}/questions/${questionId}/review`, { schoolId }, false, token);
  const approve = (questionId: string, token = teacher.token) =>
    postJson(`${app.url}/questions/${questionId}/approve`, { schoolId }, false, token);
  const publish = async (questionId: string) => {
    const review = await startReview(questionId);
    if (!review.ok) return review;
    const approval = await approve(questionId);
    if (!approval.ok) return approval;
    return postJson(
      `${app.url}/questions/${questionId}/publish`,
      { schoolId },
      false,
      teacher.token,
    );
  };

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
    expect((await getJson(`${app.url}/questions/review?schoolId=${schoolId}`)).status).toBe(401);
    expect(
      (await getJson(`${app.url}/questions/editorial-dashboard?schoolId=${schoolId}`)).status,
    ).toBe(401);
    expect(
      (
        await fetch(`${app.url}/questions/import/xlsx`, {
          method: 'POST',
          headers: {
            'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          body: Buffer.from('not-an-xlsx'),
        })
      ).status,
    ).toBe(401);
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

  it('editorial queue and publication require review and approval', async () => {
    const q = await createQuestion({ title: 'Questão editorial' });
    const reviewUrl = `${app.url}/questions/review?schoolId=${schoolId}&topicId=${topicId}&limit=100`;
    const queue = await getJson(reviewUrl, teacher.token);
    expect(queue.status).toBe(200);
    const queueBody = (await queue.json()) as { items: { questionId: string; status: string }[] };
    expect(
      queueBody.items.some(
        (question) => question.questionId === q.questionId && question.status === 'IMPORTED',
      ),
    ).toBe(true);
    expect((await getJson(reviewUrl, student.token)).status).toBe(403);

    const publishWithoutReview = await postJson(
      `${app.url}/questions/${q.questionId}/publish`,
      { schoolId },
      false,
      teacher.token,
    );
    expect(publishWithoutReview.status).toBe(409);
    expect((await startReview(q.questionId)).status).toBe(200);
    const publishWithoutApproval = await postJson(
      `${app.url}/questions/${q.questionId}/publish`,
      { schoolId },
      false,
      teacher.token,
    );
    expect(publishWithoutApproval.status).toBe(409);
    const corrected = await patchJson(
      `${app.url}/questions/${q.questionId}`,
      questionBody({ title: 'Questão editorial corrigida' }),
      teacher.token,
    );
    expect(corrected.status).toBe(200);
    expect(await corrected.json()).toMatchObject({
      title: 'Questão editorial corrigida',
      status: 'IN_REVIEW',
    });
    expect((await approve(q.questionId)).status).toBe(200);
    expect(
      (
        await postJson(
          `${app.url}/questions/${q.questionId}/publish`,
          { schoolId },
          false,
          teacher.token,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await patchJson(
          `${app.url}/questions/${q.questionId}`,
          questionBody({ title: 'Alteração após publicação' }),
          teacher.token,
        )
      ).status,
    ).toBe(409);

    const dashboard = await getJson(
      `${app.url}/questions/editorial-dashboard?schoolId=${schoolId}`,
      teacher.token,
    );
    expect(dashboard.status).toBe(200);
    expect(await dashboard.json()).toMatchObject({
      imported: expect.any(Number),
      inReview: expect.any(Number),
      approved: expect.any(Number),
      published: expect.any(Number),
      rejected: expect.any(Number),
      duplicates: expect.any(Number),
    });
  });

  it('rejects a question, returns it to review, and rejects invalid transitions', async () => {
    const q = await createQuestion({ title: 'Questão rejeitada' });
    const post = (action: string, token = teacher.token) =>
      postJson(
        `${app.url}/questions/${q.questionId}/${action}`,
        action === 'reject' ? { schoolId, reason: 'Enunciado ambíguo' } : { schoolId },
        false,
        token,
      );
    expect((await post('reject')).status).toBe(409);
    expect((await startReview(q.questionId)).status).toBe(200);
    const rejected = await post('reject');
    expect(rejected.status).toBe(200);
    expect(await rejected.json()).toMatchObject({ status: 'REJECTED' });
    expect((await post('approve')).status).toBe(409);
    expect((await post('publish')).status).toBe(409);
    expect((await post('return-to-review', student.token)).status).toBe(403);
    const back = await post('return-to-review');
    expect(back.status).toBe(200);
    expect(await back.json()).toMatchObject({ status: 'IN_REVIEW' });
    expect((await approve(q.questionId)).status).toBe(200);
    expect((await post('publish')).status).toBe(200);
  });

  it('blocks approval and publication while the image is not VALID', async () => {
    const q = await createQuestion({
      title: 'Questão com imagem',
      imageUrl: 'https://example.com/figura.png',
    });
    expect(q.status).toBe('IMPORTED');
    expect((await startReview(q.questionId)).status).toBe(200);
    expect((await approve(q.questionId)).status).toBe(409);
    const broken = await patchJson(
      `${app.url}/questions/${q.questionId}`,
      questionBody({
        title: 'Questão com imagem',
        imageUrl: 'https://example.com/figura.png',
        imageStatus: 'BROKEN',
      }),
      teacher.token,
    );
    expect(broken.status).toBe(200);
    expect((await approve(q.questionId)).status).toBe(409);
    const fixed = await patchJson(
      `${app.url}/questions/${q.questionId}`,
      questionBody({
        title: 'Questão com imagem',
        imageUrl: 'https://example.com/figura.png',
        imageStatus: 'VALID',
      }),
      teacher.token,
    );
    expect(fixed.status).toBe(200);
    expect((await approve(q.questionId)).status).toBe(200);
  });

  it('editorial dashboard reflects status counts', async () => {
    const url = `${app.url}/questions/editorial-dashboard?schoolId=${schoolId}`;
    const read = async () =>
      (await (await getJson(url, teacher.token)).json()) as Record<string, number>;
    const before = await read();
    const q = await createQuestion({ title: 'Questão dashboard' });
    expect((await read()).imported).toBe(before.imported! + 1);
    await startReview(q.questionId);
    const review = await read();
    expect(review.imported).toBe(before.imported!);
    expect(review.inReview).toBe(before.inReview! + 1);
    await approve(q.questionId);
    expect((await read()).approved).toBe(before.approved! + 1);
    expect((await getJson(url, student.token)).status).toBe(403);
  });

  it('imports XLSX into the review queue, reports duplicates, and never publishes automatically', async () => {
    const title = `Import ${randomUUID()}`;
    const row = {
      title,
      statement: `Enunciado sintético ${randomUUID()}`,
      level: 'OBMEP_N1',
      parentTopic: `Tópico ${randomUUID().slice(0, 8)}`,
      childTopic: 'Importação',
      gradeLevel: '5º Ano',
      difficulty: 'MEDIUM',
      explanation: 'Explicação de teste.',
      sourceType: 'INTERNAL',
      sourceName: 'MateMágico Test',
      authorName: 'Equipe de teste',
      authorType: 'ORGANIZATION',
      optionA: '3',
      optionB: '4',
      correctOption: 'B',
    };
    const upload = (token = teacher.token) =>
      fetch(`${app.url}/questions/import/xlsx`, {
        method: 'POST',
        headers: {
          authorization: bearer(token),
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'x-school-id': schoolId,
          'x-file-name': 'editorial-fixture.xlsx',
        },
        body: xlsxWorkbook([row]),
      });

    const forbidden = await upload(student.token);
    expect(forbidden.status).toBe(403);
    const first = await upload();
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({
      processed: 1,
      created: 1,
      duplicates: 0,
      errors: 0,
      rows: [{ result: 'CREATED' }],
    });
    const duplicate = await upload();
    expect(await duplicate.json()).toMatchObject({
      processed: 1,
      created: 0,
      duplicates: 1,
      errors: 0,
      rows: [{ result: 'DUPLICATE' }],
    });

    const review = await getJson(
      `${app.url}/questions/review?schoolId=${schoolId}&limit=100`,
      teacher.token,
    );
    expect(review.status).toBe(200);
    const queued = (await review.json()) as {
      items: { title: string; status: string; authorName: string; sourceName: string }[];
    };
    expect(queued.items).toContainEqual(
      expect.objectContaining({
        title,
        status: 'IMPORTED',
        authorName: 'Equipe de teste',
        sourceName: 'MateMágico Test',
      }),
    );
    expect(
      await getJson(`${app.url}/questions?level=OBMEP_N1`, student.token).then(async (response) =>
        ((await response.json()) as { items: { title: string }[] }).items.some(
          (question) => question.title === title,
        ),
      ),
    ).toBe(false);
    expect(
      await getJson(
        `${app.url}/questions/editorial-dashboard?schoolId=${schoolId}`,
        teacher.token,
      ).then(async (response) => {
        const body = (await response.json()) as { duplicates: number };
        return body.duplicates;
      }),
    ).toBeGreaterThan(0);
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
      `${app.url}/questions?schoolId=${schoolId}&status=IMPORTED`,
      student.token,
    );
    expect(posing.status).toBe(403);
  });

  it('authors see imported questions and the answer key', async () => {
    const q = await createQuestion({ title: 'Só autor' });
    const res = await getJson(
      `${app.url}/questions/${q.questionId}?schoolId=${schoolId}`,
      teacher.token,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; options: { isCorrect: boolean }[] };
    expect(body.status).toBe('IMPORTED');
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
    expect((await query('&status=IMPORTED')).total).toBe(1);
    expect((await query('&sourceYear=2020')).total).toBe(1);
    expect((await query('&limit=1')).items).toHaveLength(1);
    expect((await getJson(`${app.url}/questions?level=NOPE`, student.token)).status).toBe(400);
    expect((await getJson(`${app.url}/questions?limit=1000`, student.token)).status).toBe(400);
  });

  it('versions: published stays immutable, v2 returns to editorial import, publishing v2 archives v1', async () => {
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
    expect(await v2.json()).toMatchObject({ version: 2, status: 'IMPORTED', title: 'Revisada' });

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

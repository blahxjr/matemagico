import { describe, expect, it } from 'vitest';
import { InMemoryQuestionRepository } from '../infrastructure/in-memory-question.repository';
import { QuestionsError } from '../domain/questions-error';
import type { TopicLookup } from '../domain/ports';
import { parseCsvRows, parseCsvTable, parseJsonRows } from './import-parsers';
import { ImportQuestionsService } from './import-questions.service';
import {
  ArchiveQuestionService,
  CreateQuestionService,
  GetQuestionService,
  ListQuestionsService,
  PublishQuestionService,
  VersionQuestionService,
} from './question.services';

const now = new Date('2026-01-01T00:00:00.000Z');
const clock = { now: () => now };

function setup(activeTopics = ['t1', 't2']) {
  const questions = new InMemoryQuestionRepository();
  let n = 0;
  const ids = { next: () => `q${++n}` };
  const topics: TopicLookup = {
    isActiveTopic: async (id) => activeTopics.includes(id),
    findActiveTopicIdBySlug: async (slug) => (slug === 'aritmetica' ? 't1' : null),
  };
  const create = new CreateQuestionService({ questions, topics, clock, ids });
  const publish = new PublishQuestionService({ questions, topics, clock });
  return {
    questions,
    topics,
    create,
    publish,
    version: new VersionQuestionService({ questions, topics, clock }),
    archive: new ArchiveQuestionService({ questions, clock }),
    get: new GetQuestionService({ questions }),
    list: new ListQuestionsService({ questions }),
    importer: new ImportQuestionsService({ questions, topics, create, publish }),
  };
}

const content = (overrides: Record<string, unknown> = {}) => ({
  title: 'Soma',
  statement: 'Quanto é 1+1?',
  level: 'OBMEP_N1',
  topicId: 't1',
  sourceName: 'MOCK',
  sourceYear: 2024,
  sourceReference: 'Q1',
  options: [
    { label: 'A', content: '1', isCorrect: false },
    { label: 'B', content: '2', isCorrect: true },
  ],
  ...overrides,
});

const code = async (promise: Promise<unknown>) =>
  promise.then(
    () => 'ok',
    (error) => (error as QuestionsError).code,
  );

const author = { author: true };
const reader = { author: false };

describe('questions services', () => {
  it('creates a DRAFT v1 with the answer key', async () => {
    const s = setup();
    const q = await s.create.execute(content());
    expect(q).toMatchObject({ version: 1, status: 'DRAFT', publishedAt: null });
    expect(q.options.find((o) => o.isCorrect)?.label).toBe('B');
  });

  it.each([
    ['bad level', { level: 'X' }],
    ['one option', { options: [{ label: 'A', content: 'x', isCorrect: true }] }],
    [
      'two correct',
      {
        options: [
          { label: 'A', content: 'x', isCorrect: true },
          { label: 'B', content: 'y', isCorrect: true },
        ],
      },
    ],
    [
      'duplicate label',
      {
        options: [
          { label: 'A', content: 'x', isCorrect: true },
          { label: 'a', content: 'y', isCorrect: false },
        ],
      },
    ],
    ['bad year', { sourceYear: 1 }],
    ['blank title', { title: '  ' }],
  ])('rejects %s', async (_name, overrides) => {
    expect(await code(setup().create.execute(content(overrides)))).toBe('QST-001');
  });

  it('rejects unknown or inactive topics', async () => {
    expect(await code(setup().create.execute(content({ topicId: 'zzz' })))).toBe('QST-003');
  });

  it('publishes, keeps published content immutable and versions into a new DRAFT', async () => {
    const s = setup();
    const q = await s.create.execute(content());
    const published = await s.publish.execute({ questionId: q.questionId });
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toEqual(now);
    expect(await code(s.publish.execute({ questionId: q.questionId }))).toBe('QST-005');

    const v2 = await s.version.execute({ questionId: q.questionId, ...content({ title: 'Novo' }) });
    expect(v2).toMatchObject({ version: 2, status: 'DRAFT', title: 'Novo' });
    // v1 is still the live published one, unchanged.
    const live = await s.get.execute({ questionId: q.questionId, scope: reader });
    expect(live).toMatchObject({ version: 1, title: 'Soma' });

    await s.publish.execute({ questionId: q.questionId });
    const v1 = await s.get.execute({ questionId: q.questionId, version: 1, scope: author });
    expect(v1.status).toBe('ARCHIVED');
    expect((await s.get.execute({ questionId: q.questionId, scope: reader })).version).toBe(2);
  });

  it('hides the answer key and non-published content from readers', async () => {
    const s = setup();
    const q = await s.create.execute(content());
    expect(await code(s.get.execute({ questionId: q.questionId, scope: reader }))).toBe('QST-002');
    expect(await code(s.get.execute({ questionId: q.questionId, version: 1, scope: reader }))).toBe(
      'QST-002',
    );
    await s.publish.execute({ questionId: q.questionId });
    const view = await s.get.execute({ questionId: q.questionId, scope: reader });
    expect(view.options.every((o) => o.isCorrect === undefined)).toBe(true);
    const asAuthor = await s.get.execute({ questionId: q.questionId, scope: author });
    expect(asAuthor.options.some((o) => o.isCorrect === true)).toBe(true);
    expect(await code(s.get.execute({ questionId: q.questionId, version: 0, scope: author }))).toBe(
      'QST-001',
    );
  });

  it('archives the published version, or the draft; archived cannot be archived again', async () => {
    const s = setup();
    const draft = await s.create.execute(content());
    expect((await s.archive.execute({ questionId: draft.questionId })).status).toBe('ARCHIVED');
    expect(await code(s.archive.execute({ questionId: draft.questionId }))).toBe('QST-005');
    expect(await code(s.publish.execute({ questionId: draft.questionId }))).toBe('QST-005');
    expect(await code(s.archive.execute({ questionId: 'nope' }))).toBe('QST-002');

    const q = await s.create.execute(content({ sourceReference: 'Q2' }));
    await s.publish.execute({ questionId: q.questionId });
    await s.version.execute({ questionId: q.questionId, ...content({ title: 'v2' }) });
    await s.archive.execute({ questionId: q.questionId });
    const live = await code(s.get.execute({ questionId: q.questionId, scope: reader }));
    expect(live).toBe('QST-002');
  });

  it('validates ids and unknown questions', async () => {
    const s = setup();
    expect(await code(s.publish.execute({ questionId: '' }))).toBe('QST-001');
    expect(await code(s.publish.execute({ questionId: 'x' }))).toBe('QST-002');
    expect(await code(s.version.execute({ questionId: '', ...content() }))).toBe('QST-001');
    expect(await code(s.version.execute({ questionId: 'x', ...content() }))).toBe('QST-002');
    expect(await code(s.archive.execute({ questionId: ' ' }))).toBe('QST-001');
    expect(await code(s.get.execute({ questionId: ' ', scope: author }))).toBe('QST-001');
  });

  it('does not publish when the topic became inactive', async () => {
    const s = setup();
    const q = await s.create.execute(content());
    (s.topics as { isActiveTopic: TopicLookup['isActiveTopic'] }).isActiveTopic = async () => false;
    expect(await code(s.publish.execute({ questionId: q.questionId }))).toBe('QST-003');
  });

  it('lists with filters, pagination and reader scoping', async () => {
    const s = setup();
    const a = await s.create.execute(content({ sourceReference: 'A' }));
    await s.create.execute(
      content({ level: 'OBMEP_N2', topicId: 't2', sourceYear: 2023, sourceReference: 'B' }),
    );
    await s.publish.execute({ questionId: a.questionId });

    const asReader = await s.list.execute({ scope: reader });
    expect(asReader.total).toBe(1);
    expect(asReader.items[0]?.options.every((o) => o.isCorrect === undefined)).toBe(true);
    // A reader asking for imported content still only sees published.
    expect((await s.list.execute({ filter: { status: 'IMPORTED' }, scope: reader })).total).toBe(1);

    expect((await s.list.execute({ scope: author })).total).toBe(2);
    expect((await s.list.execute({ filter: { level: 'OBMEP_N2' }, scope: author })).total).toBe(1);
    expect((await s.list.execute({ filter: { topicId: 't1' }, scope: author })).total).toBe(1);
    expect((await s.list.execute({ filter: { sourceYear: 2023 }, scope: author })).total).toBe(1);
    expect((await s.list.execute({ filter: { status: 'IMPORTED' }, scope: author })).total).toBe(1);
    expect((await s.list.execute({ limit: 1, offset: 1, scope: author })).items).toHaveLength(1);

    for (const input of [
      { limit: 0 },
      { limit: 101 },
      { offset: -1 },
      { filter: { level: 'X' as never } },
      { filter: { status: 'X' as never } },
      { filter: { sourceYear: 1.5 } },
    ]) {
      expect(await code(s.list.execute({ ...input, scope: author }))).toBe('QST-001');
    }
  });

  it('wraps repository failures as QST-006', async () => {
    const s = setup();
    s.questions.findCurrent = async () => {
      throw new Error('db down');
    };
    expect(await code(s.publish.execute({ questionId: 'x' }))).toBe('QST-006');
  });
});

describe('import pipeline', () => {
  const json = JSON.stringify([
    { ...content({ topicId: undefined }), topicSlug: 'aritmetica', sourceReference: 'J1' },
    { ...content({ topicId: undefined }), topicSlug: 'desconhecido', sourceReference: 'J2' },
    {
      ...content({ topicId: undefined }),
      topicSlug: 'aritmetica',
      sourceReference: 'J3',
      level: 'bad',
    },
  ]);

  it('imports JSON, reports failures by index and is idempotent', async () => {
    const s = setup();
    const first = await s.importer.execute({ format: 'json', payload: json, publish: true });
    expect(first).toEqual({
      created: 1,
      skipped: 0,
      failed: [
        { index: 1, code: 'QST-003' },
        { index: 2, code: 'QST-001' },
      ],
    });
    expect((await s.list.execute({ scope: reader })).total).toBe(1);
    const second = await s.importer.execute({ format: 'json', payload: json });
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(1);
  });

  it('accepts the { questions: [] } envelope and rejects unreadable payloads', async () => {
    expect(parseJsonRows('{"questions":[1,{"title":"x"}]}')).toHaveLength(2);
    for (const bad of ['not json', '{"a":1}']) {
      expect(() => parseJsonRows(bad)).toThrow(QuestionsError);
    }
  });

  const csv = [
    'title,statement,level,topicSlug,sourceName,sourceYear,sourceReference,optionA,optionB,optionC,correct',
    'Soma,"Quanto é 1+1, ""certo""?",OBMEP_N1,aritmetica,MOCK,2024,C1,1,2,3,b',
    'Sem tema,Enunciado,OBMEP_N1,nada,MOCK,2024,C2,1,2,,A',
  ].join('\r\n');

  it('imports CSV with quoting and a correct-letter column', async () => {
    const s = setup();
    const report = await s.importer.execute({ format: 'csv', payload: csv, publish: true });
    expect(report).toEqual({ created: 1, skipped: 0, failed: [{ index: 1, code: 'QST-003' }] });
    const [item] = (await s.list.execute({ scope: author })).items;
    expect(item?.statement).toBe('Quanto é 1+1, "certo"?');
    expect(item?.options).toHaveLength(3);
    expect(item?.options.find((o) => o.isCorrect)?.label).toBe('B');
  });

  it('parses CSV edge cases', () => {
    expect(parseCsvTable('\uFEFFa,b\n"x\ny",z')).toEqual([
      ['a', 'b'],
      ['x\ny', 'z'],
    ]);
    expect(() => parseCsvTable('a,"b')).toThrow(QuestionsError);
    expect(() => parseCsvRows('')).toThrow(QuestionsError);
    expect(() => parseCsvRows('title,statement')).toThrow(QuestionsError);
    const rows = parseCsvRows(
      'title,statement,level,topicSlug,sourceName,sourceYear,sourceReference,optionA,optionB,correct\nT,S,L,x,N,abc,,1,2,A',
    );
    expect(rows[0]).toMatchObject({ sourceYear: 'abc', sourceReference: null });
  });

  it('rejects unsupported formats and non-string payloads', async () => {
    const s = setup();
    expect(await code(s.importer.execute({ format: 'xml' as never, payload: '' }))).toBe('QST-001');
    expect(await code(s.importer.execute({ format: 'json', payload: 1 as never }))).toBe('QST-001');
  });
});

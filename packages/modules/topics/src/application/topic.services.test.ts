import { describe, expect, it } from 'vitest';
import { InMemoryTopicRepository } from '../infrastructure/in-memory-topic.repository';
import {
  CreateTopicService,
  DeactivateTopicService,
  GetTopicService,
  ListTopicsService,
  TopicDirectory,
  UpdateTopicService,
} from './topic.services';
import { TopicsError } from '../domain/topics-error';
import type { TopicRepository } from '../domain/ports';

function setup() {
  const topics = new InMemoryTopicRepository();
  let n = 0;
  let time = new Date('2026-01-01T00:00:00Z');
  const clock = { now: () => time };
  const ids = { next: () => `topic-${++n}` };
  return {
    topics,
    tick: () => (time = new Date(time.getTime() + 1000)),
    create: new CreateTopicService({ topics, clock, ids }),
    update: new UpdateTopicService({ topics, clock }),
    deactivate: new DeactivateTopicService({ topics, clock }),
    get: new GetTopicService({ topics }),
    list: new ListTopicsService({ topics }),
    directory: new TopicDirectory(topics),
  };
}

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'NO_ERROR',
    (error: { code?: string }) => error.code,
  );

describe('topics', () => {
  it('creates an ACTIVE topic with a normalized slug', async () => {
    const s = setup();
    const topic = await s.create.execute({
      name: ' Geometria ',
      slug: ' GEO-Plana ',
      description: 'x',
    });
    expect(topic).toMatchObject({
      topicId: 'topic-1',
      name: 'Geometria',
      slug: 'geo-plana',
      status: 'ACTIVE',
    });
  });

  it.each([
    [{ name: '', slug: 'ok' }],
    [{ name: 'A', slug: 'Bad Slug' }],
    [{ name: 'A', slug: 'a' }],
    [{ name: 1 as unknown as string, slug: 'ok' }],
    [{ name: 'A', slug: 'ok', description: 'x'.repeat(1001) }],
    [{ name: 'A', slug: 'ok', description: 5 as unknown as string }],
  ])('TOP-001 for invalid input %#', async (input) => {
    expect(await codeOf(setup().create.execute(input))).toBe('TOP-001');
  });

  it('TOP-003 for a duplicated slug', async () => {
    const s = setup();
    await s.create.execute({ name: 'A', slug: 'algebra' });
    expect(await codeOf(s.create.execute({ name: 'B', slug: 'ALGEBRA' }))).toBe('TOP-003');
  });

  it('TOP-003 when the repository reports a race conflict', async () => {
    const s = setup();
    s.topics.add = async () => 'CONFLICT';
    expect(await codeOf(s.create.execute({ name: 'B', slug: 'algebra' }))).toBe('TOP-003');
  });

  it('updates name/description but never the slug', async () => {
    const s = setup();
    const created = await s.create.execute({ name: 'A', slug: 'algebra' });
    s.tick();
    const updated = await s.update.execute({
      topicId: created.topicId,
      name: 'Álgebra',
      description: 'd',
    });
    expect(updated).toMatchObject({ name: 'Álgebra', description: 'd', slug: 'algebra' });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    expect(await codeOf(s.update.execute({ topicId: created.topicId }))).toBe('TOP-001');
    expect(await codeOf(s.update.execute({ topicId: 'nope', name: 'x' }))).toBe('TOP-002');
    expect(await codeOf(s.update.execute({ topicId: ' ' }))).toBe('TOP-001');
  });

  it('deactivates idempotently and the directory reflects it', async () => {
    const s = setup();
    const created = await s.create.execute({ name: 'A', slug: 'algebra' });
    expect(await s.directory.isActiveTopic(created.topicId)).toBe(true);
    expect(await s.directory.findActiveTopicIdBySlug('Algebra')).toBe(created.topicId);
    const off = await s.deactivate.execute({ topicId: created.topicId });
    expect(off.status).toBe('INACTIVE');
    expect((await s.deactivate.execute({ topicId: created.topicId })).status).toBe('INACTIVE');
    expect(await s.directory.isActiveTopic(created.topicId)).toBe(false);
    expect(await s.directory.findActiveTopicIdBySlug('algebra')).toBeNull();
    expect(await s.directory.isActiveTopic('missing')).toBe(false);
    expect(await codeOf(s.deactivate.execute({ topicId: 'x' }))).toBe('TOP-002');
    expect(await codeOf(s.deactivate.execute({ topicId: '' }))).toBe('TOP-001');
  });

  it('gets and lists topics, filtering by status', async () => {
    const s = setup();
    const a = await s.create.execute({ name: 'Zeta', slug: 'zeta' });
    await s.create.execute({ name: 'Alfa', slug: 'alfa' });
    await s.deactivate.execute({ topicId: a.topicId });
    expect((await s.get.execute({ topicId: a.topicId })).slug).toBe('zeta');
    expect(await codeOf(s.get.execute({ topicId: 'x' }))).toBe('TOP-002');
    expect(await codeOf(s.get.execute({ topicId: '' }))).toBe('TOP-001');
    expect((await s.list.execute()).map((t) => t.slug)).toEqual(['alfa', 'zeta']);
    expect((await s.list.execute({ status: 'ACTIVE' })).map((t) => t.slug)).toEqual(['alfa']);
    expect(await codeOf(s.list.execute({ status: 'X' as never }))).toBe('TOP-001');
  });

  it('wraps repository failures as TOP-004', async () => {
    const broken = {
      findById: async () => Promise.reject(new Error('db')),
      findBySlug: async () => Promise.reject(new Error('db')),
      list: async () => Promise.reject(new Error('db')),
    } as unknown as TopicRepository;
    expect(await codeOf(new GetTopicService({ topics: broken }).execute({ topicId: 'a' }))).toBe(
      'TOP-004',
    );
    expect(await codeOf(new ListTopicsService({ topics: broken }).execute())).toBe('TOP-004');
    const creator = new CreateTopicService({
      topics: broken,
      clock: { now: () => new Date() },
      ids: { next: () => 'i' },
    });
    expect(await codeOf(creator.execute({ name: 'A', slug: 'ab' }))).toBe('TOP-004');
    expect(new TopicsError('TOP-002').message).toMatch(/not found/);
  });
});

import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { Topic } from '../domain/topic';
import { PrismaTopicRepository } from './prisma-topic.repository';

const databaseUrl = process.env.TEST_DATABASE_URL;
const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;
afterAll(() => prisma?.$disconnect());

describe.skipIf(!prisma)('PrismaTopicRepository', () => {
  const repo = new PrismaTopicRepository(prisma!);
  const run = Math.random().toString(36).slice(2, 8);
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('adds, finds, lists, saves and reports slug conflicts', async () => {
    const topic = Topic.create({
      topicId: `t-${run}`,
      name: 'Tema',
      slug: `tema-${run}`,
      description: 'd',
      now,
    });
    expect(await repo.add(topic)).toBe('CREATED');
    expect(
      await repo.add(
        Topic.create({ topicId: `t2-${run}`, name: 'Outro', slug: `tema-${run}`, now }),
      ),
    ).toBe('CONFLICT');
    expect((await repo.findById(topic.id))?.slug).toBe(`tema-${run}`);
    expect((await repo.findBySlug(`tema-${run}`))?.id).toBe(topic.id);
    expect(await repo.findById('missing')).toBeNull();
    await repo.save(topic.deactivate(now));
    expect((await repo.findById(topic.id))?.status).toBe('INACTIVE');
    const inactive = await repo.list({ status: 'INACTIVE' });
    expect(inactive.some((t) => t.id === topic.id)).toBe(true);
    expect((await repo.list({ status: 'ACTIVE' })).some((t) => t.id === topic.id)).toBe(false);
    expect((await repo.list({})).length).toBeGreaterThan(0);
  });
});

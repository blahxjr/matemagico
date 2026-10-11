import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { Question, parseContent } from '../domain/question';
import { PrismaQuestionRepository } from './prisma-question.repository';

const databaseUrl = process.env.TEST_DATABASE_URL;
const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;
afterAll(() => prisma?.$disconnect());

describe.skipIf(!prisma)('PrismaQuestionRepository', () => {
  const repo = new PrismaQuestionRepository(prisma!);
  const run = Math.random().toString(36).slice(2, 8);
  const topicId = `qt-${run}`;
  const now = new Date('2026-01-01T00:00:00.000Z');
  const content = (title: string, ref: string, level = 'OBMEP_N1') =>
    parseContent({
      title,
      statement: 'Enunciado',
      level,
      topicId,
      sourceName: `SRC-${run}`,
      sourceYear: 2024,
      sourceReference: ref,
      options: [
        { label: 'A', content: '1', isCorrect: true },
        { label: 'B', content: '2', isCorrect: false },
      ],
    });

  it('stores versions, keeps one current and one published, and filters', async () => {
    await prisma!.topic.create({
      data: {
        topicId,
        name: `T ${run}`,
        slug: `t-${run}`,
        description: '',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    });
    const q1 = Question.create({ questionId: `q1-${run}`, content: content('v1', 'R1'), now });
    expect(await repo.add(q1)).toBe('CREATED');
    expect(await repo.add(q1)).toBe('CONFLICT');
    expect(
      await repo.existsBySource({
        sourceName: `SRC-${run}`,
        sourceYear: 2024,
        sourceReference: 'R1',
      }),
    ).toBe(true);
    expect(
      await repo.existsBySource({
        sourceName: `SRC-${run}`,
        sourceYear: 2024,
        sourceReference: 'zz',
      }),
    ).toBe(false);

    await repo.publish(q1.publish(now));
    const v2 = Question.create({
      questionId: `q1-version-${run}`,
      content: content('v2', 'R1'),
      now,
    });
    expect(await repo.addVersion(v2)).toBe('CREATED');
    expect(await repo.addVersion(v2)).toBe('CONFLICT');

    expect((await repo.findCurrent(q1.id))?.version).toBe(2);
    expect((await repo.findPublished(q1.id))?.version).toBe(1);
    expect((await repo.findVersion(q1.id, 1))?.options).toHaveLength(2);
    expect(await repo.findVersion(q1.id, 9)).toBeNull();

    await repo.publish(v2.publish(now));
    expect((await repo.findPublished(q1.id))?.version).toBe(2);
    expect((await repo.findVersion(q1.id, 1))?.status).toBe('ARCHIVED');

    const q2 = Question.create({
      questionId: `q2-${run}`,
      content: content('outra', 'R2', 'OBMEP_N2'),
      now,
    });
    await repo.add(q2);

    const all = await repo.list({ topicId }, { limit: 10, offset: 0 });
    expect(all.total).toBe(2);
    expect(
      (await repo.list({ topicId, status: 'PUBLISHED' }, { limit: 10, offset: 0 })).total,
    ).toBe(1);
    expect(
      (
        await repo.list(
          { topicId, status: 'IMPORTED', level: 'OBMEP_N2' },
          { limit: 10, offset: 0 },
        )
      ).items[0]?.id,
    ).toBe(q2.id);
    expect((await repo.list({ topicId, sourceYear: 1999 }, { limit: 10, offset: 0 })).total).toBe(
      0,
    );
    expect((await repo.list({ topicId }, { limit: 1, offset: 1 })).items).toHaveLength(1);

    await repo.saveStatus(q2.archive(now));
    expect((await repo.findCurrent(q2.id))?.status).toBe('ARCHIVED');
  });
});

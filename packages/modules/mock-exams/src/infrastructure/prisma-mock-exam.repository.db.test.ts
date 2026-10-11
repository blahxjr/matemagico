import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { MockExam, MockExamsError } from '../domain/mock-exam';
import { PrismaMockExamRepository } from './prisma-mock-exam.repository';

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('PrismaMockExamRepository', () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const repository = new PrismaMockExamRepository(prisma);
  const exams: string[] = [];
  const questions: string[] = [];
  const now = new Date();

  async function addQuestion(questionId = randomUUID(), version = 1) {
    questions.push(questionId);
    await prisma.question.create({
      data: {
        questionId,
        version,
        title: `Question ${questionId}`,
        statement: 'A published question.',
        level: 'OBMEP_N1',
        sourceName: 'TEST',
        status: 'PUBLISHED',
        topicId: randomUUID(),
        isCurrent: true,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        options: {
          create: [
            {
              optionId: `${questionId}:${version}:A`,
              label: 'A',
              content: 'Wrong',
              isCorrect: false,
            },
            {
              optionId: `${questionId}:${version}:B`,
              label: 'B',
              content: 'Right',
              isCorrect: true,
            },
          ],
        },
      },
    });
    return questionId;
  }

  afterEach(async () => {
    await prisma.mockExam.deleteMany({ where: { examId: { in: exams.splice(0) } } });
    await prisma.question.deleteMany({ where: { questionId: { in: questions.splice(0) } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists the exact question version, order, and answer-free exam view', async () => {
    const questionId = await addQuestion();
    const examId = randomUUID();
    exams.push(examId);
    const exam = MockExam.create({
      examId,
      title: 'Frozen version test',
      description: null,
      schoolId: randomUUID(),
      level: 'OBMEP_N1',
      durationMinutes: 30,
      availableFrom: null,
      availableUntil: null,
      questions: [{ questionId, questionVersion: 1, position: 1 }],
      now,
    });

    const draft = await repository.create(exam);
    expect(draft.questions[0]).toMatchObject({ questionId, questionVersion: 1, position: 1 });
    expect(draft.questions[0]?.options[0]).not.toHaveProperty('isCorrect');

    const published = await repository.publish(exam.publish(now));
    expect(published.status).toBe('PUBLISHED');
    expect((await repository.findById(examId, exam.schoolId))?.questions[0]?.questionVersion).toBe(
      1,
    );
  });

  it('rejects references to missing question versions', async () => {
    const examId = randomUUID();
    const exam = MockExam.create({
      examId,
      title: 'Invalid reference',
      description: null,
      schoolId: randomUUID(),
      level: 'OBMEP_N1',
      durationMinutes: 30,
      availableFrom: null,
      availableUntil: null,
      questions: [{ questionId: randomUUID(), questionVersion: 1, position: 1 }],
      now,
    });
    await expect(repository.create(exam)).rejects.toMatchObject({
      code: 'EXM-001',
    } satisfies Partial<MockExamsError>);
  });

  it('publishes an exam using a frozen version that was later archived', async () => {
    const questionId = await addQuestion();
    const examId = randomUUID();
    exams.push(examId);
    const exam = MockExam.create({
      examId,
      title: 'Frozen archived version',
      description: null,
      schoolId: randomUUID(),
      level: 'OBMEP_N1',
      durationMinutes: 30,
      availableFrom: null,
      availableUntil: null,
      questions: [{ questionId, questionVersion: 1, position: 1 }],
      now,
    });

    await repository.create(exam);
    await prisma.question.update({
      where: { questionId_version: { questionId, version: 1 } },
      data: { status: 'ARCHIVED', isCurrent: false },
    });

    const published = await repository.publish(exam.publish(now));
    expect(published.status).toBe('PUBLISHED');
    expect(published.questions[0]).toMatchObject({ questionId, questionVersion: 1 });
  });
});

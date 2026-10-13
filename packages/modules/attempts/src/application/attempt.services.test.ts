import { describe, expect, it } from 'vitest';
import { Attempt, AutoCorrect } from '../domain/attempt';
import type { AttemptRepository } from '../domain/ports';
import {
  ExpireAttempt,
  FinishAttempt,
  GetAttempt,
  GetAttemptHistory,
  GetSchoolPerformance,
  SubmitAnswer,
} from './attempt.services';

const started = () =>
  Attempt.start({
    attemptId: 'attempt-1',
    schoolId: 'school-1',
    userId: 'user-1',
    startedAt: new Date('2026-10-11T10:00:00Z'),
    expiresAt: new Date('2026-10-11T10:30:00Z'),
    snapshot: {
      examId: 'exam-1',
      title: 'Simulado',
      durationMinutes: 30,
      questions: [
        {
          questionId: 'q1',
          questionVersion: 1,
          position: 1,
          topicId: 'aritmetica',
          title: 'Q1',
          statement: '2+2?',
          difficulty: 'EASY',
          gradeLevel: 'OBMEP_N1',
          options: [
            { label: 'A', content: '3', isCorrect: false },
            { label: 'B', content: '4', isCorrect: true },
          ],
        },
        {
          questionId: 'q2',
          questionVersion: 1,
          position: 2,
          topicId: 'geometria',
          title: 'Q2',
          statement: 'Lado?',
          difficulty: 'MEDIUM',
          gradeLevel: 'OBMEP_N1',
          options: [
            { label: 'A', content: '4', isCorrect: true },
            { label: 'B', content: '5', isCorrect: false },
          ],
        },
      ],
    },
  });

describe('Attempt', () => {
  it('auto-corrects answers and calculates final result per topic, difficulty, and gradeLevel', () => {
    const complete = started()
      .submitAnswer({
        questionId: 'q1',
        selectedOption: 'B',
        now: new Date('2026-10-11T10:01:00Z'),
      })
      .submitAnswer({
        questionId: 'q2',
        selectedOption: 'B',
        now: new Date('2026-10-11T10:02:00Z'),
      })
      .finish(new Date('2026-10-11T10:03:00Z'));
    expect(complete.state).toMatchObject({
      status: 'SUBMITTED',
      result: {
        score: 50,
        percentage: 50,
        correctAnswers: 1,
        wrongAnswers: 1,
        totalQuestions: 2,
        topicResults: {
          aritmetica: { correctAnswers: 1, wrongAnswers: 0, totalQuestions: 1, percentage: 100 },
          geometria: { correctAnswers: 0, wrongAnswers: 1, totalQuestions: 1, percentage: 0 },
        },
        difficultyResults: {
          EASY: { correctAnswers: 1, wrongAnswers: 0, totalQuestions: 1, percentage: 100 },
          MEDIUM: { correctAnswers: 0, wrongAnswers: 1, totalQuestions: 1, percentage: 0 },
        },
        gradeLevelResults: {
          OBMEP_N1: { correctAnswers: 1, wrongAnswers: 1, totalQuestions: 2, percentage: 50 },
        },
      },
    });
  });

  it('expires attempt when finished after expiresAt', () => {
    const expired = started().finish(new Date('2026-10-11T10:35:00Z'));
    expect(expired.state.status).toBe('EXPIRED');
    expect(expired.state.result).toMatchObject({
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 2,
      totalQuestions: 2,
    });
  });

  it('is idempotent when finalization is retried and blocks late answers', () => {
    const complete = started().finish(new Date('2026-10-11T10:03:00Z'));
    expect(complete.finish(new Date('2026-10-11T10:04:00Z'))).toBe(complete);
    expect(() =>
      complete.submitAnswer({
        questionId: 'q1',
        selectedOption: 'B',
        now: new Date('2026-10-11T10:04:00Z'),
      }),
    ).toThrow(expect.objectContaining({ code: 'ATT-003' }));
  });

  it('looks up an attempt only by its scoped identity before submitting an answer', async () => {
    const state = started().state;
    const attempts: AttemptRepository = {
      start: async () => state,
      findById: async (input) => {
        expect(input).toEqual({
          attemptId: state.attemptId,
          schoolId: state.schoolId,
          userId: state.userId,
        });
        return state;
      },
      listByUser: async () => [state],
      listSubmittedBySchool: async () => [],
      saveAnswer: async (attempt) => attempt.state,
      finish: async (attempt) => attempt.state,
    };
    const service = new SubmitAnswer({
      attempts,
      clock: { now: () => new Date('2026-10-11T10:01:00Z') },
    });

    const answer = await service.execute({
      attemptId: state.attemptId,
      schoolId: state.schoolId,
      userId: state.userId,
      questionId: 'q1',
      selectedOption: 'B',
    });
    expect(answer.answers).toMatchObject([{ questionId: 'q1', selectedOption: 'B' }]);
  });

  it('aggregates performance per student and per topic', async () => {
    const answered = (option1: string, option2: string, finishAt: string) =>
      started()
        .submitAnswer({
          questionId: 'q1',
          selectedOption: option1,
          now: new Date('2026-10-11T10:01:00Z'),
        })
        .submitAnswer({
          questionId: 'q2',
          selectedOption: option2,
          now: new Date('2026-10-11T10:02:00Z'),
        })
        .finish(new Date(finishAt)).state;
    const list = [
      answered('B', 'A', '2026-10-11T10:03:00Z'),
      answered('A', 'A', '2026-10-11T10:10:00Z'),
    ];
    const performance = await new GetSchoolPerformance({
      attempts: { listSubmittedBySchool: async () => list } as unknown as AttemptRepository,
    }).execute({ schoolId: 'school-1' });
    expect(performance.students).toEqual([
      {
        studentId: 'user-1',
        attempts: 2,
        averageScore: 75,
        lastScore: 50,
        lastAttemptAt: '2026-10-11T10:10:00.000Z',
      },
    ]);
    expect(performance.topics).toEqual([
      { topicId: 'aritmetica', correctAnswers: 1, wrongAnswers: 1, percentage: 50 },
      { topicId: 'geometria', correctAnswers: 2, wrongAnswers: 0, percentage: 100 },
    ]);
  });

  it('supports GetAttempt and GetAttemptHistory scoped to user', async () => {
    const state = started().state;
    const attempts: AttemptRepository = {
      start: async () => state,
      findById: async ({ attemptId, schoolId, userId }) => {
        if (attemptId === state.attemptId && userId === state.userId && schoolId === state.schoolId)
          return state;
        return null;
      },
      listByUser: async ({ schoolId, userId, examId }) => {
        if (schoolId === state.schoolId && userId === state.userId) return [state];
        return [];
      },
      listSubmittedBySchool: async () => [],
      saveAnswer: async (attempt) => attempt.state,
      finish: async (attempt) => attempt.state,
    };

    const getAttempt = new GetAttempt({ attempts });
    const getAttemptHistory = new GetAttemptHistory({ attempts });

    const found = await getAttempt.execute({
      attemptId: state.attemptId,
      schoolId: state.schoolId,
      userId: state.userId,
    });
    expect(found.attemptId).toBe(state.attemptId);

    await expect(
      getAttempt.execute({
        attemptId: state.attemptId,
        schoolId: state.schoolId,
        userId: 'other-user',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'ATT-002' }));

    const history = await getAttemptHistory.execute({
      schoolId: state.schoolId,
      userId: state.userId,
    });
    expect(history).toHaveLength(1);
    expect(history[0]?.attemptId).toBe(state.attemptId);

    const emptyHistory = await getAttemptHistory.execute({
      schoolId: state.schoolId,
      userId: 'other-user',
    });
    expect(emptyHistory).toHaveLength(0);
  });
});

import { describe, expect, it } from 'vitest';
import { Attempt } from '../domain/attempt';
import type { AttemptRepository } from '../domain/ports';
import { SubmitAnswer } from './attempt.services';

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
          options: [
            { label: 'A', content: '4', isCorrect: true },
            { label: 'B', content: '5', isCorrect: false },
          ],
        },
      ],
    },
  });

describe('Attempt', () => {
  it('auto-corrects answers and calculates final result per topic', () => {
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
        totalQuestions: 2,
        topicResults: { aritmetica: { percentage: 100 }, geometria: { percentage: 0 } },
      },
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
});

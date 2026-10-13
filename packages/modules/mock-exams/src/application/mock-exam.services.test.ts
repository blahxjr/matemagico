import { describe, expect, it } from 'vitest';
import { MockExam, MockExamsError } from '../domain/mock-exam';

const base = {
  examId: 'exam',
  title: 'Simulado',
  description: null,
  schoolId: 'school',
  level: 'OBMEP_N1' as const,
  durationMinutes: 60,
  availableFrom: null,
  availableUntil: null,
  questions: [{ questionId: 'q1', questionVersion: 2, position: 1 }],
  now: new Date('2026-01-01T00:00:00Z'),
};

describe('MockExam', () => {
  it('rejects invalid duration, duplicate references, and an invalid window', () => {
    expect(() => MockExam.create({ ...base, durationMinutes: 0 })).toThrowError(
      expect.objectContaining({ code: 'EXM-001' }),
    );
    expect(() =>
      MockExam.create({
        ...base,
        questions: [
          { questionId: 'q1', questionVersion: 1, position: 1 },
          { questionId: 'q1', questionVersion: 2, position: 2 },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: 'EXM-001' }));
    expect(() =>
      MockExam.create({
        ...base,
        availableFrom: new Date('2026-01-02T00:00:00Z'),
        availableUntil: new Date('2026-01-01T00:00:00Z'),
      }),
    ).toThrowError(expect.objectContaining({ code: 'EXM-004' }));
    expect(() => MockExam.create({ ...base, availableFrom: new Date('invalid') })).toThrowError(
      expect.objectContaining({ code: 'EXM-004' }),
    );
  });

  it('freezes its question references when published and cannot be edited afterward', () => {
    const published = MockExam.create(base).publish(base.now);
    expect(published.questions).toEqual(base.questions);
    expect(published.status).toBe('PUBLISHED');
    expect(() => published.publish(base.now)).toThrowError(
      expect.objectContaining({ code: 'EXM-003' }),
    );
  });

  it('cannot start outside its availability window', () => {
    const exam = MockExam.create({
      ...base,
      availableFrom: new Date('2026-01-02T00:00:00Z'),
    }).publish(base.now);
    expect(() => exam.assertCanStart(base.now)).toThrowError(
      expect.objectContaining({ code: 'EXM-005' }),
    );
    expect(() => exam.assertCanStart(new Date('2026-01-03T00:00:00Z'))).not.toThrow();
  });

  it('uses a specific error for invalid lifecycle actions', () => {
    try {
      MockExam.create(base).archive(base.now);
      throw new Error('Expected archive of draft to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(MockExamsError);
      expect(error).toMatchObject({ code: 'EXM-003' });
    }
  });
});

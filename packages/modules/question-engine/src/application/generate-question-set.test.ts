import { describe, expect, it } from 'vitest';
import { GenerateQuestionSet, ValidateQuestionSet } from './generate-question-set';
import type { QuestionCandidate } from '../domain/question-set';

const questions: QuestionCandidate[] = Array.from({ length: 8 }, (_, index) => ({
  questionId: `q${index}`,
  questionVersion: 1,
  level: 'OBMEP_N1',
  topicId: 'topic',
  status: 'PUBLISHED',
  isCurrent: true,
}));

describe('GenerateQuestionSet', () => {
  it('returns the same ordered question set for the same seed', async () => {
    let reverse = false;
    const service = new GenerateQuestionSet({
      findPublishedCurrent: async () => {
        reverse = !reverse;
        return reverse ? [...questions].reverse() : questions;
      },
    });
    const input = { level: 'OBMEP_N1' as const, topicId: 'topic', quantity: 4, seed: 'same' };
    const first = await service.execute(input);
    const second = await service.execute(input);
    expect(first).toEqual(second);
    expect(first).toHaveLength(input.quantity);
    expect(new Set(first.map(({ questionId }) => questionId)).size).toBe(input.quantity);
  });

  it('fails when there are not enough eligible questions', async () => {
    const limited = new GenerateQuestionSet({
      findPublishedCurrent: async () => questions.slice(0, 2),
    });
    await expect(
      limited.execute({ level: 'OBMEP_N1', topicId: 'topic', quantity: 3, seed: 'same' }),
    ).rejects.toMatchObject({ code: 'QEN-001' });
  });

  it('filters unpublished and non-current versions, and validates duplicates', async () => {
    const serviceWithInvalid = new GenerateQuestionSet({
      findPublishedCurrent: async () => [
        ...questions.slice(0, 2),
        { ...questions[2]!, status: 'DRAFT' },
        { ...questions[3]!, isCurrent: false },
      ],
    });
    expect(
      await serviceWithInvalid.execute({
        level: 'OBMEP_N1',
        topicId: 'topic',
        quantity: 2,
        seed: 's',
      }),
    ).toHaveLength(2);
    const validate = new ValidateQuestionSet();
    expect(() =>
      validate.execute([
        { questionId: 'same', questionVersion: 1 },
        { questionId: 'same', questionVersion: 2 },
      ]),
    ).toThrowError(expect.objectContaining({ code: 'QEN-003' }));
  });
});

import { describe, expect, it } from 'vitest';
import { createQuestionSchema, fieldErrors, loginSchema, registerSchema } from './index';

describe('validation schemas', () => {
  it('validates login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: '', password: '' }).success).toBe(false);
  });

  it('validates register and reports field errors', () => {
    const result = registerSchema.safeParse({ name: '', email: 'x', password: 'curta' });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(['email', 'name', 'password']);
  });

  it('requires exactly one correct option', () => {
    const base = {
      schoolId: 's',
      topicId: 't',
      title: 'T',
      statement: 'S',
      level: 'OBMEP_N1',
      explanation: 'E',
    };
    const options = (flags: boolean[]) =>
      flags.map((isCorrect, index) => ({ label: 'ABCDE'[index], content: 'x', isCorrect }));
    expect(
      createQuestionSchema.safeParse({ ...base, options: options([true, false]) }).success,
    ).toBe(true);
    expect(
      createQuestionSchema.safeParse({ ...base, options: options([true, true]) }).success,
    ).toBe(false);
  });
});

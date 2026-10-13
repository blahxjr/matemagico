import { z } from 'zod';

const id = z.string().trim().min(1).max(128);

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').max(254),
  password: z.string().min(1, 'Informe a senha.').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email('E-mail inválido.')),
  password: z.string().min(12, 'A senha deve ter ao menos 12 caracteres.').max(128),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const QUESTION_LEVELS = ['OBMEP_MIRIM', 'OBMEP_N1', 'OBMEP_N2', 'OBMEP_N3'] as const;
export const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

export const questionOptionSchema = z.object({
  label: z.enum(OPTION_LABELS),
  content: z.string().trim().min(1),
  isCorrect: z.boolean(),
});

export const createQuestionSchema = z
  .object({
    schoolId: id,
    topicId: id,
    title: z.string().trim().min(1).max(200),
    statement: z.string().trim().min(1),
    level: z.enum(QUESTION_LEVELS),
    explanation: z.string().trim().min(1),
    options: z.array(questionOptionSchema).min(2).max(5),
  })
  .refine((value) => value.options.filter((option) => option.isCorrect).length === 1, {
    message: 'Exatamente uma alternativa deve ser correta.',
    path: ['options'],
  });
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const EDITORIAL_ACTIONS = [
  'review',
  'approve',
  'reject',
  'return-to-review',
  'publish',
] as const;

export const editorialActionSchema = z.object({ schoolId: id });
export const rejectQuestionSchema = z.object({
  schoolId: id,
  reason: z.string().trim().min(1, 'Informe o motivo.').max(1000),
});
export type RejectQuestionInput = z.infer<typeof rejectQuestionSchema>;

export const startAttemptSchema = z.object({ schoolId: id });
export const submitAnswerSchema = z.object({
  schoolId: id,
  questionId: id,
  selectedOption: z.enum(OPTION_LABELS),
});
export const finishAttemptSchema = z.object({ schoolId: id });
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

export const ADMIN_ROLES = ['STUDENT', 'TEACHER', 'SCHOOL_ADMIN'] as const;
export const grantRoleSchema = z.object({ roleId: z.enum(ADMIN_ROLES) });
export type GrantRoleInput = z.infer<typeof grantRoleSchema>;

const optionalDateTime = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida.');

/** Fields a teacher fills in to create an exam; the school comes from the Session, never the form. */
export const createExamSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(200),
  description: z.string().trim().max(2000).optional(),
  level: z.enum(QUESTION_LEVELS),
  topicId: id,
  quantity: z.number().int().min(1, 'Mínimo de 1 questão.').max(100),
  durationMinutes: z.number().int().positive('Informe a duração em minutos.'),
  availableFrom: optionalDateTime.optional(),
  availableUntil: optionalDateTime.optional(),
});
export type CreateExamInput = z.infer<typeof createExamSchema>;

export const updateExamSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    durationMinutes: z.number().int().positive().optional(),
    availableFrom: optionalDateTime.nullable().optional(),
    availableUntil: optionalDateTime.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nada para atualizar.' });
export type UpdateExamInput = z.infer<typeof updateExamSchema>;

/** Flattens the first Zod issue of each field into a `{ field: message }` map for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

import type { QuestionLevel } from '@matemagico/questions';

export const MOCK_EXAM_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type MockExamStatus = (typeof MOCK_EXAM_STATUSES)[number];

export interface MockExamQuestionReference {
  readonly questionId: string;
  readonly questionVersion: number;
  readonly position: number;
}

export interface MockExamInput {
  readonly examId: string;
  readonly title: string;
  readonly description: string | null;
  readonly schoolId: string;
  readonly level: QuestionLevel;
  readonly durationMinutes: number;
  readonly availableFrom: Date | null;
  readonly availableUntil: Date | null;
  readonly questions: readonly MockExamQuestionReference[];
  readonly now: Date;
}

export interface MockExamSnapshot {
  readonly examId: string;
  readonly title: string;
  readonly description: string | null;
  readonly schoolId: string;
  readonly level: QuestionLevel;
  readonly status: MockExamStatus;
  readonly durationMinutes: number;
  readonly availableFrom: Date | null;
  readonly availableUntil: Date | null;
  readonly questions: readonly MockExamQuestionReference[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly publishedAt: Date | null;
}

export class MockExamsError extends Error {
  constructor(
    readonly code: 'EXM-001' | 'EXM-002' | 'EXM-003' | 'EXM-004' | 'EXM-005' | 'EXM-006',
  ) {
    super(code);
    this.name = 'MockExamsError';
  }
}

function validate(input: MockExamInput): void {
  if (
    !input.title.trim() ||
    input.title.length > 200 ||
    (input.description !== null && input.description.length > 2000) ||
    !input.schoolId.trim() ||
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes <= 0 ||
    input.questions.length === 0
  ) {
    throw new MockExamsError('EXM-001');
  }
  if (
    (input.availableFrom !== null && Number.isNaN(input.availableFrom.getTime())) ||
    (input.availableUntil !== null && Number.isNaN(input.availableUntil.getTime()))
  ) {
    throw new MockExamsError('EXM-004');
  }
  if (
    input.availableFrom &&
    input.availableUntil &&
    input.availableUntil.getTime() < input.availableFrom.getTime()
  ) {
    throw new MockExamsError('EXM-004');
  }
  const seen = new Set<string>();
  for (const [index, question] of input.questions.entries()) {
    if (
      !question.questionId.trim() ||
      !Number.isInteger(question.questionVersion) ||
      question.questionVersion < 1 ||
      question.position !== index + 1 ||
      seen.has(question.questionId)
    ) {
      throw new MockExamsError('EXM-001');
    }
    seen.add(question.questionId);
  }
}

export class MockExam {
  private constructor(
    readonly examId: string,
    readonly title: string,
    readonly description: string | null,
    readonly schoolId: string,
    readonly level: QuestionLevel,
    readonly status: MockExamStatus,
    readonly durationMinutes: number,
    readonly availableFrom: Date | null,
    readonly availableUntil: Date | null,
    readonly questions: readonly MockExamQuestionReference[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly publishedAt: Date | null,
  ) {}

  static create(input: MockExamInput): MockExam {
    validate(input);
    if (!input.examId.trim()) throw new MockExamsError('EXM-001');
    return new MockExam(
      input.examId,
      input.title.trim(),
      input.description?.trim() || null,
      input.schoolId,
      input.level,
      'DRAFT',
      input.durationMinutes,
      input.availableFrom ? new Date(input.availableFrom) : null,
      input.availableUntil ? new Date(input.availableUntil) : null,
      input.questions.map((question) => ({ ...question })),
      new Date(input.now),
      new Date(input.now),
      null,
    );
  }

  static restore(snapshot: MockExamSnapshot): MockExam {
    return new MockExam(
      snapshot.examId,
      snapshot.title,
      snapshot.description,
      snapshot.schoolId,
      snapshot.level,
      snapshot.status,
      snapshot.durationMinutes,
      snapshot.availableFrom,
      snapshot.availableUntil,
      snapshot.questions,
      snapshot.createdAt,
      snapshot.updatedAt,
      snapshot.publishedAt,
    );
  }

  publish(now: Date): MockExam {
    if (this.status !== 'DRAFT') throw new MockExamsError('EXM-003');
    return new MockExam(
      this.examId,
      this.title,
      this.description,
      this.schoolId,
      this.level,
      'PUBLISHED',
      this.durationMinutes,
      this.availableFrom,
      this.availableUntil,
      this.questions,
      this.createdAt,
      new Date(now),
      new Date(now),
    );
  }

  archive(now: Date): MockExam {
    if (this.status !== 'PUBLISHED') throw new MockExamsError('EXM-003');
    return new MockExam(
      this.examId,
      this.title,
      this.description,
      this.schoolId,
      this.level,
      'ARCHIVED',
      this.durationMinutes,
      this.availableFrom,
      this.availableUntil,
      this.questions,
      this.createdAt,
      new Date(now),
      this.publishedAt,
    );
  }

  assertCanStart(now: Date): void {
    if (this.status !== 'PUBLISHED') throw new MockExamsError('EXM-005');
    if (this.availableFrom && now.getTime() < this.availableFrom.getTime()) {
      throw new MockExamsError('EXM-005');
    }
    if (this.availableUntil && now.getTime() > this.availableUntil.getTime()) {
      throw new MockExamsError('EXM-005');
    }
  }
}

import type { QuestionLevel } from '@matemagico/questions';
import type { MockExam, MockExamQuestionReference, MockExamStatus } from './mock-exam';

export interface ExamQuestionView extends MockExamQuestionReference {
  readonly title: string;
  readonly statement: string;
  readonly level: QuestionLevel;
  readonly options: readonly { readonly label: string; readonly content: string }[];
}

export interface MockExamView {
  readonly examId: string;
  readonly title: string;
  readonly description: string | null;
  readonly schoolId: string;
  readonly level: QuestionLevel;
  readonly status: MockExamStatus;
  readonly durationMinutes: number;
  readonly availableFrom: Date | null;
  readonly availableUntil: Date | null;
  readonly questions: readonly ExamQuestionView[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly publishedAt: Date | null;
}

export interface MockExamRepository {
  create(exam: MockExam): Promise<MockExamView>;
  findById(examId: string, schoolId: string): Promise<MockExamView | null>;
  list(input: {
    schoolId: string;
    status?: MockExamStatus;
    availableAt?: Date;
  }): Promise<MockExamView[]>;
  publish(exam: MockExam): Promise<MockExamView>;
  archive(exam: MockExam): Promise<MockExamView>;
}

export interface QuestionSetGenerator {
  execute(input: {
    level: QuestionLevel;
    topicId: string;
    quantity: number;
    seed: string;
  }): Promise<readonly { readonly questionId: string; readonly questionVersion: number }[]>;
}

export interface Clock {
  now(): Date;
}

export interface ExamIdGenerator {
  next(): string;
}

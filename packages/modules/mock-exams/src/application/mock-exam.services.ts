import type { QuestionLevel } from '@matemagico/questions';
import { MockExam, MockExamsError, type MockExamStatus } from '../domain/mock-exam';
import type {
  Clock,
  ExamIdGenerator,
  MockExamRepository,
  MockExamView,
  QuestionSetGenerator,
} from '../domain/ports';

function validateCreate(input: CreateMockExamInput): void {
  if (
    !input ||
    typeof input.title !== 'string' ||
    input.title.trim().length === 0 ||
    input.title.length > 200 ||
    typeof input.schoolId !== 'string' ||
    !input.schoolId.trim() ||
    typeof input.topicId !== 'string' ||
    !input.topicId.trim() ||
    typeof input.seed !== 'string'
  ) {
    throw new MockExamsError('EXM-001');
  }
  if (
    input.description !== undefined &&
    input.description !== null &&
    (typeof input.description !== 'string' || input.description.length > 2000)
  ) {
    throw new MockExamsError('EXM-001');
  }
  if (
    (input.availableFrom && Number.isNaN(input.availableFrom.getTime())) ||
    (input.availableUntil && Number.isNaN(input.availableUntil.getTime()))
  ) {
    throw new MockExamsError('EXM-004');
  }
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes <= 0 ||
    (input.availableFrom &&
      input.availableUntil &&
      input.availableUntil.getTime() < input.availableFrom.getTime())
  ) {
    throw new MockExamsError(
      input.durationMinutes <= 0 || !Number.isInteger(input.durationMinutes)
        ? 'EXM-001'
        : 'EXM-004',
    );
  }
}

export interface CreateMockExamInput {
  readonly title: string;
  readonly description?: string | null;
  readonly schoolId: string;
  readonly level: QuestionLevel;
  readonly topicId: string;
  readonly quantity: number;
  readonly seed: string;
  readonly durationMinutes: number;
  readonly availableFrom?: Date | null;
  readonly availableUntil?: Date | null;
}

export class CreateMockExam {
  constructor(
    private readonly deps: {
      exams: MockExamRepository;
      questionSets: QuestionSetGenerator;
      clock: Clock;
      ids: ExamIdGenerator;
    },
  ) {}

  async execute(input: CreateMockExamInput): Promise<MockExamView> {
    validateCreate(input);
    const selected = await this.deps.questionSets.execute({
      level: input.level,
      topicId: input.topicId,
      quantity: input.quantity,
      seed: input.seed,
    });
    const exam = MockExam.create({
      examId: this.deps.ids.next(),
      title: input.title,
      description: input.description ?? null,
      schoolId: input.schoolId,
      level: input.level,
      durationMinutes: input.durationMinutes,
      availableFrom: input.availableFrom ?? null,
      availableUntil: input.availableUntil ?? null,
      questions: selected.map((question, index) => ({ ...question, position: index + 1 })),
      now: this.deps.clock.now(),
    });
    return this.deps.exams.create(exam);
  }
}

export class PublishMockExam {
  constructor(private readonly deps: { exams: MockExamRepository; clock: Clock }) {}

  async execute(input: { examId: string; schoolId: string }): Promise<MockExamView> {
    const existing = await this.deps.exams.findById(input.examId, input.schoolId);
    if (!existing) throw new MockExamsError('EXM-002');
    const exam = MockExam.restore({
      ...existing,
      questions: existing.questions.map(({ questionId, questionVersion, position }) => ({
        questionId,
        questionVersion,
        position,
      })),
    });
    return this.deps.exams.publish(exam.publish(this.deps.clock.now()));
  }
}

export class ArchiveMockExam {
  constructor(private readonly deps: { exams: MockExamRepository; clock: Clock }) {}

  async execute(input: { examId: string; schoolId: string }): Promise<MockExamView> {
    const existing = await this.deps.exams.findById(input.examId, input.schoolId);
    if (!existing) throw new MockExamsError('EXM-002');
    const exam = MockExam.restore({
      ...existing,
      questions: existing.questions.map(({ questionId, questionVersion, position }) => ({
        questionId,
        questionVersion,
        position,
      })),
    }).archive(this.deps.clock.now());
    return this.deps.exams.archive(exam);
  }
}

export class GetMockExam {
  constructor(private readonly exams: MockExamRepository) {}

  async execute(input: { examId: string; schoolId: string }): Promise<MockExamView> {
    const exam = await this.exams.findById(input.examId, input.schoolId);
    if (!exam) throw new MockExamsError('EXM-002');
    return exam;
  }
}

export class ListMockExams {
  constructor(private readonly exams: MockExamRepository) {}

  execute(input: {
    schoolId: string;
    status?: MockExamStatus;
    availableAt?: Date;
  }): Promise<MockExamView[]> {
    return this.exams.list(input);
  }
}

export class StartExam {
  constructor(private readonly deps: { exams: MockExamRepository; clock: Clock }) {}

  async execute(input: { examId: string; schoolId: string }): Promise<{
    examId: string;
    title: string;
    questions: MockExamView['questions'];
  }> {
    const exam = await this.deps.exams.findById(input.examId, input.schoolId);
    if (!exam) throw new MockExamsError('EXM-002');
    MockExam.restore({
      ...exam,
      questions: exam.questions.map(({ questionId, questionVersion, position }) => ({
        questionId,
        questionVersion,
        position,
      })),
    }).assertCanStart(this.deps.clock.now());
    return { examId: exam.examId, title: exam.title, questions: exam.questions };
  }
}

export function examStatus(status: string): MockExamStatus {
  if (status === 'DRAFT' || status === 'PUBLISHED' || status === 'ARCHIVED') return status;
  throw new MockExamsError('EXM-001');
}

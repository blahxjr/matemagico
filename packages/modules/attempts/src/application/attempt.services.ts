import type { MockExamView } from '@matemagico/mock-exams';
import {
  Attempt,
  AttemptsError,
  type AttemptSnapshot,
  type AttemptSnapshotState,
} from '../domain/attempt';
import type { AttemptIdGenerator, AttemptRepository, Clock } from '../domain/ports';

export interface ExamLookup {
  findById(examId: string, schoolId: string): Promise<MockExamView | null>;
}

const view = (state: AttemptSnapshotState) => ({
  attemptId: state.attemptId,
  schoolId: state.schoolId,
  userId: state.userId,
  examId: state.snapshot.examId,
  title: state.snapshot.title,
  status: state.status,
  startedAt: state.startedAt,
  expiresAt: state.expiresAt,
  submittedAt: state.submittedAt,
  questions: state.snapshot.questions.map(({ options, ...question }) => ({
    ...question,
    options: options.map(({ label, content }) => ({ label, content })),
  })),
  answers: state.answers.map(({ isCorrect: _isCorrect, ...answer }) => answer),
  result: state.result,
});

function snapshot(exam: MockExamView): AttemptSnapshot {
  return {
    examId: exam.examId,
    title: exam.title,
    durationMinutes: exam.durationMinutes,
    questions: exam.questions.map((question) => ({
      questionId: question.questionId,
      questionVersion: question.questionVersion,
      position: question.position,
      topicId: question.topicId,
      title: question.title,
      statement: question.statement,
      options: question.options.map((option) => ({ ...option })),
    })),
  };
}

export class StartAttempt {
  constructor(
    private readonly deps: {
      attempts: AttemptRepository;
      exams: ExamLookup;
      clock: Clock;
      ids: AttemptIdGenerator;
    },
  ) {}
  async execute(input: { schoolId: string; userId: string; examId: string }) {
    const exam = await this.deps.exams.findById(input.examId, input.schoolId);
    if (!exam || exam.status !== 'PUBLISHED') throw new AttemptsError('ATT-002');
    const now = this.deps.clock.now();
    if (
      (exam.availableFrom && now < exam.availableFrom) ||
      (exam.availableUntil && now > exam.availableUntil)
    )
      throw new AttemptsError('ATT-002');
    const examSnapshot = snapshot(exam);
    const raw = await this.deps.attempts.start(
      Attempt.start({
        attemptId: this.deps.ids.next(),
        schoolId: input.schoolId,
        userId: input.userId,
        snapshot: examSnapshot,
        startedAt: now,
        expiresAt: new Date(now.getTime() + exam.durationMinutes * 60_000),
      }),
    );
    return view(raw);
  }
}
export class SubmitAnswer {
  constructor(private readonly deps: { attempts: AttemptRepository; clock: Clock }) {}
  async execute(input: {
    attemptId: string;
    schoolId: string;
    userId: string;
    questionId: string;
    selectedOption: string;
  }) {
    const current = await this.deps.attempts.findById({
      attemptId: input.attemptId,
      schoolId: input.schoolId,
      userId: input.userId,
    });
    if (!current) throw new AttemptsError('ATT-002');
    return view(
      await this.deps.attempts.saveAnswer(
        Attempt.restore(current).submitAnswer({
          questionId: input.questionId,
          selectedOption: input.selectedOption,
          now: this.deps.clock.now(),
        }),
      ),
    );
  }
}
export class FinishAttempt {
  constructor(private readonly deps: { attempts: AttemptRepository; clock: Clock }) {}
  async execute(input: { attemptId: string; schoolId: string; userId: string }) {
    const current = await this.deps.attempts.findById(input);
    if (!current) throw new AttemptsError('ATT-002');
    if (current.status !== 'IN_PROGRESS') return view(current);
    return view(
      await this.deps.attempts.finish(Attempt.restore(current).finish(this.deps.clock.now())),
    );
  }
}
export class ExpireAttempt {
  constructor(private readonly deps: { attempts: AttemptRepository; clock: Clock }) {}
  async execute(input: { attemptId: string; schoolId: string; userId: string }) {
    const current = await this.deps.attempts.findById(input);
    if (!current) throw new AttemptsError('ATT-002');
    if (current.status !== 'IN_PROGRESS') return view(current);
    return view(
      await this.deps.attempts.finish(
        Attempt.restore(current).finish(this.deps.clock.now(), 'EXPIRED'),
      ),
    );
  }
}

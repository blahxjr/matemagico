export const ATTEMPT_STATUSES = ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export interface AttemptQuestionSnapshot {
  readonly questionId: string;
  readonly questionVersion: number;
  readonly position: number;
  readonly topicId: string;
  readonly title: string;
  readonly statement: string;
  readonly options: readonly {
    readonly label: string;
    readonly content: string;
    readonly isCorrect: boolean;
  }[];
}

export interface AttemptSnapshot {
  readonly examId: string;
  readonly title: string;
  readonly durationMinutes: number;
  readonly questions: readonly AttemptQuestionSnapshot[];
}

export interface AttemptAnswer {
  readonly questionId: string;
  readonly questionVersion: number;
  readonly selectedOption: string;
  readonly isCorrect: boolean;
  readonly answeredAt: Date;
}

export interface AttemptResult {
  readonly score: number;
  readonly correctAnswers: number;
  readonly totalQuestions: number;
  readonly percentage: number;
  readonly topicResults: Readonly<
    Record<
      string,
      {
        readonly correctAnswers: number;
        readonly totalQuestions: number;
        readonly percentage: number;
      }
    >
  >;
}

export interface AttemptSnapshotState {
  readonly attemptId: string;
  readonly schoolId: string;
  readonly userId: string;
  readonly status: AttemptStatus;
  readonly snapshot: AttemptSnapshot;
  readonly startedAt: Date;
  readonly expiresAt: Date;
  readonly submittedAt: Date | null;
  readonly answers: readonly AttemptAnswer[];
  readonly result: AttemptResult | null;
}

export class AttemptsError extends Error {
  constructor(
    readonly code: 'ATT-001' | 'ATT-002' | 'ATT-003' | 'ATT-004' | 'ATT-005' | 'ATT-006',
  ) {
    super(code);
    this.name = 'AttemptsError';
  }
}

export class Attempt {
  private constructor(readonly state: AttemptSnapshotState) {}

  static start(
    input: Omit<AttemptSnapshotState, 'status' | 'submittedAt' | 'answers' | 'result'>,
  ): Attempt {
    if (
      !input.attemptId.trim() ||
      !input.schoolId.trim() ||
      !input.userId.trim() ||
      input.snapshot.questions.length === 0 ||
      input.expiresAt <= input.startedAt
    )
      throw new AttemptsError('ATT-001');
    return new Attempt({
      ...input,
      status: 'IN_PROGRESS',
      submittedAt: null,
      answers: [],
      result: null,
    });
  }

  static restore(state: AttemptSnapshotState): Attempt {
    return new Attempt(state);
  }

  submitAnswer(input: { questionId: string; selectedOption: string; now: Date }): Attempt {
    if (this.state.status !== 'IN_PROGRESS') throw new AttemptsError('ATT-003');
    if (input.now >= this.state.expiresAt) throw new AttemptsError('ATT-004');
    const question = this.state.snapshot.questions.find(
      (item) => item.questionId === input.questionId,
    );
    if (!question || !question.options.some((option) => option.label === input.selectedOption))
      throw new AttemptsError('ATT-001');
    const answer: AttemptAnswer = {
      questionId: question.questionId,
      questionVersion: question.questionVersion,
      selectedOption: input.selectedOption,
      isCorrect: question.options.some(
        (option) => option.label === input.selectedOption && option.isCorrect,
      ),
      answeredAt: new Date(input.now),
    };
    const answers = [
      ...this.state.answers.filter((item) => item.questionId !== question.questionId),
      answer,
    ];
    return new Attempt({ ...this.state, answers });
  }

  finish(now: Date, status: 'SUBMITTED' | 'EXPIRED' = 'SUBMITTED'): Attempt {
    if (this.state.status === status) return this;
    if (this.state.status !== 'IN_PROGRESS') throw new AttemptsError('ATT-003');
    if (status === 'SUBMITTED' && now >= this.state.expiresAt) return this.finish(now, 'EXPIRED');
    const byTopic: Record<
      string,
      { correctAnswers: number; totalQuestions: number; percentage: number }
    > = {};
    let correctAnswers = 0;
    for (const question of this.state.snapshot.questions) {
      const answer = this.state.answers.find((item) => item.questionId === question.questionId);
      const topic = byTopic[question.topicId] ?? {
        correctAnswers: 0,
        totalQuestions: 0,
        percentage: 0,
      };
      topic.totalQuestions += 1;
      if (answer?.isCorrect) {
        correctAnswers += 1;
        topic.correctAnswers += 1;
      }
      byTopic[question.topicId] = topic;
    }
    for (const topic of Object.values(byTopic))
      topic.percentage = Number(((topic.correctAnswers / topic.totalQuestions) * 100).toFixed(2));
    const totalQuestions = this.state.snapshot.questions.length;
    const percentage = Number(((correctAnswers / totalQuestions) * 100).toFixed(2));
    return new Attempt({
      ...this.state,
      status,
      submittedAt: new Date(now),
      result: {
        score: percentage,
        correctAnswers,
        totalQuestions,
        percentage,
        topicResults: byTopic,
      },
    });
  }
}

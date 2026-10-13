export const ATTEMPT_STATUSES = ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export interface OutboxEvent<T = unknown> {
  readonly eventId: string;
  readonly eventName: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly schemaVersion: number;
  readonly schoolId: string;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly payload: T;
}

export type AttemptCompletedPayload = {
  readonly attemptId: string;
  readonly examId: string;
  readonly userId: string;
  readonly schoolId: string;
  readonly score: number;
  readonly percentage?: number;
  readonly correctAnswers: number;
  readonly timeSpentSeconds: number;
};

export interface AttemptQuestionSnapshot {
  readonly questionId: string;
  readonly questionVersion: number;
  readonly position: number;
  readonly topicId: string;
  readonly title: string;
  readonly statement: string;
  readonly level?: string | null;
  readonly difficulty?: string | null;
  readonly gradeLevel?: string | null;
  readonly imageUrl?: string | null;
  readonly explanation?: string | null;
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

export interface StatBreakdown {
  readonly correctAnswers: number;
  readonly wrongAnswers: number;
  readonly totalQuestions: number;
  readonly percentage: number;
}

export interface AttemptResult {
  readonly score: number;
  readonly correctAnswers: number;
  readonly wrongAnswers: number;
  readonly totalQuestions: number;
  readonly percentage: number;
  readonly topicResults: Readonly<Record<string, StatBreakdown>>;
  readonly difficultyResults: Readonly<Record<string, StatBreakdown>>;
  readonly gradeLevelResults: Readonly<Record<string, StatBreakdown>>;
}

export class AutoCorrect {
  static calculate(
    questions: readonly AttemptQuestionSnapshot[],
    answers: readonly AttemptAnswer[],
  ): AttemptResult {
    const byTopic: Record<
      string,
      { correctAnswers: number; wrongAnswers: number; totalQuestions: number; percentage: number }
    > = {};
    const byDifficulty: Record<
      string,
      { correctAnswers: number; wrongAnswers: number; totalQuestions: number; percentage: number }
    > = {};
    const byGradeLevel: Record<
      string,
      { correctAnswers: number; wrongAnswers: number; totalQuestions: number; percentage: number }
    > = {};

    let correctAnswers = 0;

    for (const question of questions) {
      const answer = answers.find((item) => item.questionId === question.questionId);
      const isCorrect = Boolean(answer?.isCorrect);

      const topicKey = question.topicId;
      const topic = byTopic[topicKey] ?? {
        correctAnswers: 0,
        wrongAnswers: 0,
        totalQuestions: 0,
        percentage: 0,
      };
      topic.totalQuestions += 1;
      if (isCorrect) topic.correctAnswers += 1;
      else topic.wrongAnswers += 1;
      byTopic[topicKey] = topic;

      const diffKey = question.difficulty ?? 'MEDIUM';
      const diff = byDifficulty[diffKey] ?? {
        correctAnswers: 0,
        wrongAnswers: 0,
        totalQuestions: 0,
        percentage: 0,
      };
      diff.totalQuestions += 1;
      if (isCorrect) diff.correctAnswers += 1;
      else diff.wrongAnswers += 1;
      byDifficulty[diffKey] = diff;

      const gradeKey = question.gradeLevel ?? question.level ?? 'UNKNOWN';
      const grade = byGradeLevel[gradeKey] ?? {
        correctAnswers: 0,
        wrongAnswers: 0,
        totalQuestions: 0,
        percentage: 0,
      };
      grade.totalQuestions += 1;
      if (isCorrect) grade.correctAnswers += 1;
      else grade.wrongAnswers += 1;
      byGradeLevel[gradeKey] = grade;

      if (isCorrect) correctAnswers += 1;
    }

    const calcPercentage = (correct: number, total: number) =>
      total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0;

    for (const item of Object.values(byTopic))
      item.percentage = calcPercentage(item.correctAnswers, item.totalQuestions);
    for (const item of Object.values(byDifficulty))
      item.percentage = calcPercentage(item.correctAnswers, item.totalQuestions);
    for (const item of Object.values(byGradeLevel))
      item.percentage = calcPercentage(item.correctAnswers, item.totalQuestions);

    const totalQuestions = questions.length;
    const wrongAnswers = totalQuestions - correctAnswers;
    const percentage = calcPercentage(correctAnswers, totalQuestions);

    return {
      score: percentage,
      correctAnswers,
      wrongAnswers,
      totalQuestions,
      percentage,
      topicResults: byTopic,
      difficultyResults: byDifficulty,
      gradeLevelResults: byGradeLevel,
    };
  }
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
    const result = AutoCorrect.calculate(this.state.snapshot.questions, this.state.answers);
    return new Attempt({
      ...this.state,
      status,
      submittedAt: new Date(now),
      result,
    });
  }
}

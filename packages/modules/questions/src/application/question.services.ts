import {
  parseContent,
  Question,
  QUESTION_LEVELS,
  QUESTION_STATUSES,
  type QuestionLevel,
  type QuestionOption,
  type QuestionStatus,
  type RawQuestionContent,
} from '../domain/question';
import type {
  Clock,
  QuestionFilter,
  QuestionIdGenerator,
  QuestionRepository,
  TopicLookup,
} from '../domain/ports';
import { QuestionsError } from '../domain/questions-error';

export interface QuestionOptionView {
  readonly optionId: string;
  readonly label: string;
  readonly content: string;
  /** Present only when the reader is allowed to see the answer key. */
  readonly isCorrect?: boolean;
}

export interface QuestionView {
  readonly questionId: string;
  readonly version: number;
  readonly title: string;
  readonly statement: string;
  readonly level: QuestionLevel;
  readonly status: QuestionStatus;
  readonly topicId: string;
  readonly sourceName: string;
  readonly sourceYear: number | null;
  readonly sourceReference: string | null;
  readonly sourceType: Question['content']['sourceType'];
  readonly legacyId: string | null;
  readonly authorName: string;
  readonly authorType: Question['content']['authorType'];
  readonly authorVerified: boolean;
  readonly gradeLevel: string | null;
  readonly difficulty: Question['content']['difficulty'];
  readonly explanation: string | null;
  readonly imageUrl: string | null;
  readonly imageStatus: Question['content']['imageStatus'];
  readonly imageHash: string | null;
  readonly tags: readonly string[];
  readonly options: readonly QuestionOptionView[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly publishedAt: Date | null;
}

const optionView = (option: QuestionOption, includeAnswers: boolean): QuestionOptionView =>
  includeAnswers
    ? { ...option }
    : { optionId: option.optionId, label: option.label, content: option.content };

export const toQuestionView = (question: Question, includeAnswers: boolean): QuestionView => ({
  questionId: question.id,
  version: question.version,
  title: question.content.title,
  statement: question.content.statement,
  level: question.content.level,
  status: question.status,
  topicId: question.content.topicId,
  sourceName: question.content.sourceName,
  sourceYear: question.content.sourceYear,
  sourceReference: question.content.sourceReference,
  sourceType: question.content.sourceType,
  legacyId: question.content.legacyId,
  authorName: question.content.authorName,
  authorType: question.content.authorType,
  authorVerified: question.content.authorVerified,
  gradeLevel: question.content.gradeLevel,
  difficulty: question.content.difficulty,
  explanation: question.content.explanation,
  imageUrl: question.content.imageUrl,
  imageStatus: question.content.imageStatus,
  imageHash: question.content.imageHash,
  tags: question.content.tags,
  options: question.options.map((option) => optionView(option, includeAnswers)),
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
  publishedAt: question.publishedAt,
});

export async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof QuestionsError) throw error;
    throw new QuestionsError('QST-006');
  }
}

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim();

async function requireActiveTopic(topics: TopicLookup, topicId: string) {
  const active = await guard(() => topics.isActiveTopic(topicId));
  if (!active) throw new QuestionsError('QST-003');
}

export class CreateQuestionService {
  constructor(
    private readonly deps: {
      questions: QuestionRepository;
      topics: TopicLookup;
      clock: Clock;
      ids: QuestionIdGenerator;
    },
  ) {}

  async execute(input: RawQuestionContent): Promise<QuestionView> {
    const content = parseContent(input);
    await requireActiveTopic(this.deps.topics, content.topicId);
    const question = Question.create({
      questionId: this.deps.ids.next(),
      content,
      now: this.deps.clock.now(),
    });
    const result = await guard(() => this.deps.questions.add(question));
    if (result === 'CONFLICT') throw new QuestionsError('QST-004');
    return toQuestionView(question, true);
  }
}

export class VersionQuestionService {
  constructor(
    private readonly deps: { questions: QuestionRepository; topics: TopicLookup; clock: Clock },
  ) {}

  async execute(input: { questionId: string } & RawQuestionContent): Promise<QuestionView> {
    if (isBlank(input?.questionId)) throw new QuestionsError('QST-001');
    const { questionId, ...raw } = input;
    const content = parseContent(raw);
    const current = await guard(() => this.deps.questions.findCurrent(questionId));
    if (!current) throw new QuestionsError('QST-002');
    await requireActiveTopic(this.deps.topics, content.topicId);
    if (current.status === 'PUBLISHED') throw new QuestionsError('QST-005');
    const updated = current.update(content, this.deps.clock.now());
    await guard(() => this.deps.questions.save(updated));
    return toQuestionView(updated, true);
  }
}

export class PublishQuestionService {
  constructor(
    private readonly deps: { questions: QuestionRepository; topics: TopicLookup; clock: Clock },
  ) {}

  async execute(input: { questionId: string }): Promise<QuestionView> {
    if (isBlank(input?.questionId)) throw new QuestionsError('QST-001');
    const current = await guard(() => this.deps.questions.findCurrent(input.questionId));
    if (!current) throw new QuestionsError('QST-002');
    const published = current.publish(this.deps.clock.now());
    await requireActiveTopic(this.deps.topics, current.content.topicId);
    await guard(() => this.deps.questions.publish(published));
    return toQuestionView(published, true);
  }
}

export class StartReviewService {
  constructor(private readonly deps: { questions: QuestionRepository; clock: Clock }) {}
  async execute(input: { questionId: string }): Promise<QuestionView> {
    const current = await requireQuestion(this.deps.questions, input.questionId);
    const updated = current.startReview(this.deps.clock.now());
    await guard(() => this.deps.questions.saveStatus(updated));
    return toQuestionView(updated, true);
  }
}

export class ApproveQuestionService {
  constructor(private readonly deps: { questions: QuestionRepository; clock: Clock }) {}
  async execute(input: { questionId: string }): Promise<QuestionView> {
    const current = await requireQuestion(this.deps.questions, input.questionId);
    const updated = current.approve(this.deps.clock.now());
    await guard(() => this.deps.questions.saveStatus(updated));
    return toQuestionView(updated, true);
  }
}

export class RejectQuestionService {
  constructor(private readonly deps: { questions: QuestionRepository; clock: Clock }) {}
  async execute(input: { questionId: string }): Promise<QuestionView> {
    const current = await requireQuestion(this.deps.questions, input.questionId);
    const updated = current.reject(this.deps.clock.now());
    await guard(() => this.deps.questions.saveStatus(updated));
    return toQuestionView(updated, true);
  }
}

export class ReturnToReviewService {
  constructor(private readonly deps: { questions: QuestionRepository; clock: Clock }) {}
  async execute(input: { questionId: string }): Promise<QuestionView> {
    const current = await requireQuestion(this.deps.questions, input.questionId);
    const updated = current.returnToReview(this.deps.clock.now());
    await guard(() => this.deps.questions.saveStatus(updated));
    return toQuestionView(updated, true);
  }
}

export class UpdateQuestionService {
  constructor(
    private readonly deps: { questions: QuestionRepository; topics: TopicLookup; clock: Clock },
  ) {}
  async execute(input: { questionId: string } & RawQuestionContent): Promise<QuestionView> {
    if (isBlank(input?.questionId)) throw new QuestionsError('QST-001');
    const { questionId, ...raw } = input;
    const content = parseContent(raw);
    await requireActiveTopic(this.deps.topics, content.topicId);
    const current = await requireQuestion(this.deps.questions, questionId);
    const updated = current.update(content, this.deps.clock.now());
    await guard(() => this.deps.questions.save(updated));
    return toQuestionView(updated, true);
  }
}

export class EditorialDashboardService {
  constructor(private readonly questions: QuestionRepository) {}
  async execute() {
    const status = await guard(() => this.questions.countByStatus());
    return {
      imported: status.IMPORTED,
      inReview: status.IN_REVIEW,
      approved: status.APPROVED,
      published: status.PUBLISHED,
      rejected: status.REJECTED,
      duplicates: 0,
    };
  }
}

async function requireQuestion(
  repository: QuestionRepository,
  questionId: string,
): Promise<Question> {
  if (isBlank(questionId)) throw new QuestionsError('QST-001');
  const current = await guard(() => repository.findCurrent(questionId));
  if (!current) throw new QuestionsError('QST-002');
  return current;
}

export class ArchiveQuestionService {
  constructor(private readonly deps: { questions: QuestionRepository; clock: Clock }) {}

  /** Archives the live published version, or the current draft when nothing is published. */
  async execute(input: { questionId: string }): Promise<QuestionView> {
    if (isBlank(input?.questionId)) throw new QuestionsError('QST-001');
    const target =
      (await guard(() => this.deps.questions.findPublished(input.questionId))) ??
      (await guard(() => this.deps.questions.findCurrent(input.questionId)));
    if (!target) throw new QuestionsError('QST-002');
    const archived = target.archive(this.deps.clock.now());
    await guard(() => this.deps.questions.saveStatus(archived));
    return toQuestionView(archived, true);
  }
}

export interface ReaderScope {
  /** Authors see drafts/archived versions and the answer key. */
  readonly author: boolean;
}

export class GetQuestionService {
  constructor(private readonly deps: { questions: QuestionRepository }) {}

  async execute(input: {
    questionId: string;
    version?: number;
    scope: ReaderScope;
  }): Promise<QuestionView> {
    if (isBlank(input?.questionId)) throw new QuestionsError('QST-001');
    let question: Question | null;
    if (input.version !== undefined) {
      if (!Number.isInteger(input.version) || input.version < 1)
        throw new QuestionsError('QST-001');
      question = await guard(() =>
        this.deps.questions.findVersion(input.questionId, input.version as number),
      );
      if (!input.scope.author && question?.status !== 'PUBLISHED') question = null;
    } else {
      question = input.scope.author
        ? await guard(() => this.deps.questions.findCurrent(input.questionId))
        : await guard(() => this.deps.questions.findPublished(input.questionId));
    }
    if (!question) throw new QuestionsError('QST-002');
    return toQuestionView(question, input.scope.author);
  }
}

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export class ListQuestionsService {
  constructor(private readonly deps: { questions: QuestionRepository }) {}

  async execute(input: {
    filter?: QuestionFilter;
    limit?: number;
    offset?: number;
    scope: ReaderScope;
  }): Promise<{ items: QuestionView[]; total: number; limit: number; offset: number }> {
    const filter = input.filter ?? {};
    const limit = input.limit ?? DEFAULT_PAGE_SIZE;
    const offset = input.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new QuestionsError('QST-001');
    }
    if (!Number.isInteger(offset) || offset < 0) throw new QuestionsError('QST-001');
    if (filter.level !== undefined && !QUESTION_LEVELS.includes(filter.level)) {
      throw new QuestionsError('QST-001');
    }
    if (filter.status !== undefined && !QUESTION_STATUSES.includes(filter.status)) {
      throw new QuestionsError('QST-001');
    }
    if (filter.sourceYear !== undefined && !Number.isInteger(filter.sourceYear)) {
      throw new QuestionsError('QST-001');
    }
    // Non-authors can only ever see published questions.
    const effective: QuestionFilter = input.scope.author
      ? filter
      : { ...filter, status: 'PUBLISHED' };
    const { items, total } = await guard(() =>
      this.deps.questions.list(effective, { limit, offset }),
    );
    return {
      items: items.map((question) => toQuestionView(question, input.scope.author)),
      total,
      limit,
      offset,
    };
  }
}

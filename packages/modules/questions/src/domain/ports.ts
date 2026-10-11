import type { Question, QuestionLevel, QuestionStatus } from './question';

export type AddQuestionResult = 'CREATED' | 'CONFLICT';

export interface QuestionFilter {
  readonly level?: QuestionLevel;
  readonly topicId?: string;
  readonly status?: QuestionStatus;
  readonly sourceYear?: number;
}

export interface Page {
  readonly limit: number;
  readonly offset: number;
}

export interface QuestionRepository {
  /** Inserts version 1 as the current version. */
  add(question: Question): Promise<AddQuestionResult>;
  /** Inserts version N+1 as the current version; CONFLICT if that version already exists. */
  addVersion(question: Question): Promise<AddQuestionResult>;
  findCurrent(questionId: string): Promise<Question | null>;
  findVersion(questionId: string, version: number): Promise<Question | null>;
  findPublished(questionId: string): Promise<Question | null>;
  /** Status-only update (archive). Content is never rewritten. */
  saveStatus(question: Question): Promise<void>;
  /** Saves editorial content/status before publication; published content is immutable. */
  save(question: Question): Promise<void>;
  /** Atomically archives any other published version and publishes this one. */
  publish(question: Question): Promise<void>;
  /**
   * PUBLISHED filter lists the live published versions; any other filter (or none) lists
   * the current version of each question.
   */
  list(filter: QuestionFilter, page: Page): Promise<{ items: Question[]; total: number }>;
  existsBySource(source: {
    sourceName: string;
    sourceYear: number | null;
    sourceReference: string;
  }): Promise<boolean>;
  existsByFingerprint(fingerprint: string): Promise<boolean>;
  countByStatus(): Promise<Record<QuestionStatus, number>>;
}

/** Implemented in the composition root over the Topics module. */
export interface TopicLookup {
  isActiveTopic(topicId: string): Promise<boolean>;
  findActiveTopicIdBySlug(slug: string): Promise<string | null>;
}

export interface Clock {
  now(): Date;
}

export interface QuestionIdGenerator {
  next(): string;
}

import { QuestionsError } from './questions-error';

export const QUESTION_LEVELS = ['OBMEP_MIRIM', 'OBMEP_N1', 'OBMEP_N2', 'OBMEP_N3'] as const;
export type QuestionLevel = (typeof QUESTION_LEVELS)[number];

export const QUESTION_STATUSES = [
  'IMPORTED',
  'IN_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const AUTHOR_TYPES = ['AUTHOR', 'ORGANIZATION', 'UNKNOWN'] as const;
export type AuthorType = (typeof AUTHOR_TYPES)[number];
export const SOURCE_TYPES = ['OLYMPIAD', 'EXAM', 'BOOK', 'INTERNAL', 'UNKNOWN'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const IMAGE_STATUSES = ['PENDING', 'VALID', 'BROKEN', 'MISSING'] as const;
export type ImageStatus = (typeof IMAGE_STATUSES)[number];
export const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

export interface QuestionSource {
  readonly sourceType: SourceType;
  readonly sourceName: string;
  readonly sourceYear: number | null;
  readonly sourceReference: string | null;
  readonly legacyId: string | null;
}

export interface EditorialMetadata {
  readonly authorName: string;
  readonly authorType: AuthorType;
  readonly authorVerified: boolean;
  readonly gradeLevel: string | null;
  readonly difficulty: Difficulty | null;
  readonly explanation: string | null;
  readonly imageUrl: string | null;
  readonly imageStatus: ImageStatus;
  readonly imageHash: string | null;
  readonly tags: readonly string[];
}

export interface QuestionOption {
  readonly optionId: string;
  readonly label: string;
  readonly content: string;
  readonly isCorrect: boolean;
}

export interface QuestionContent extends QuestionSource, EditorialMetadata {
  readonly title: string;
  readonly statement: string;
  readonly level: QuestionLevel;
  readonly topicId: string;
  readonly options: readonly Omit<QuestionOption, 'optionId'>[];
}

export interface QuestionSnapshot extends QuestionContent {
  readonly questionId: string;
  readonly version: number;
  readonly status: QuestionStatus;
  readonly options: readonly QuestionOption[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly publishedAt: Date | null;
}

export interface RawQuestionContent {
  title?: unknown;
  statement?: unknown;
  level?: unknown;
  topicId?: unknown;
  sourceType?: unknown;
  sourceName?: unknown;
  sourceYear?: unknown;
  sourceReference?: unknown;
  legacyId?: unknown;
  authorName?: unknown;
  authorType?: unknown;
  authorVerified?: unknown;
  gradeLevel?: unknown;
  difficulty?: unknown;
  explanation?: unknown;
  imageUrl?: unknown;
  imageStatus?: unknown;
  imageHash?: unknown;
  tags?: unknown;
  options?: unknown;
}

const invalid = () => new QuestionsError('QST-001');
const text = (raw: unknown, max: number): string => {
  if (typeof raw !== 'string') throw invalid();
  const value = raw.trim();
  if (!value || value.length > max) throw invalid();
  return value;
};
const optionalText = (raw: unknown, max: number): string | null => {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') throw invalid();
  const value = raw.trim();
  if (!value) return null;
  if (value.length > max) throw invalid();
  return value;
};
const enumValue = <T extends readonly string[]>(
  raw: unknown,
  values: T,
  fallback: T[number],
): T[number] =>
  raw === undefined
    ? fallback
    : values.includes(raw as T[number])
      ? (raw as T[number])
      : (() => {
          throw invalid();
        })();

/** Normalizes import and editorial content; nothing malformed is partially accepted. */
export function parseContent(raw: RawQuestionContent): QuestionContent {
  if (typeof raw !== 'object' || raw === null) throw invalid();
  if (!(QUESTION_LEVELS as readonly unknown[]).includes(raw.level)) throw invalid();
  let sourceYear: number | null = null;
  if (raw.sourceYear !== undefined && raw.sourceYear !== null) {
    if (
      typeof raw.sourceYear !== 'number' ||
      !Number.isInteger(raw.sourceYear) ||
      raw.sourceYear < 1900 ||
      raw.sourceYear > 2100
    ) {
      throw invalid();
    }
    sourceYear = raw.sourceYear as number;
  }
  if (!Array.isArray(raw.options) || raw.options.length < 2 || raw.options.length > 5)
    throw invalid();
  const labels = new Set<string>();
  const options = raw.options.map((option: unknown) => {
    if (typeof option !== 'object' || option === null) throw invalid();
    const { label, content, isCorrect } = option as Record<string, unknown>;
    const normalized = typeof label === 'string' ? label.trim().toUpperCase() : '';
    if (!(OPTION_LABELS as readonly string[]).includes(normalized) || labels.has(normalized)) {
      throw invalid();
    }
    if (typeof isCorrect !== 'boolean') throw invalid();
    labels.add(normalized);
    return { label: normalized, content: text(content, 1000), isCorrect };
  });
  if (options.filter((option) => option.isCorrect).length !== 1) throw invalid();
  const tags =
    raw.tags === undefined
      ? []
      : Array.isArray(raw.tags)
        ? [...new Set(raw.tags.map((tag) => text(tag, 80).toLowerCase()))].sort()
        : (() => {
            throw invalid();
          })();
  const imageUrl = optionalText(raw.imageUrl, 2048);
  const imageStatus = enumValue(raw.imageStatus, IMAGE_STATUSES, imageUrl ? 'PENDING' : 'MISSING');
  return {
    title: text(raw.title, 200),
    statement: text(raw.statement, 5000),
    level: raw.level as QuestionLevel,
    topicId: text(raw.topicId, 128),
    sourceType: enumValue(raw.sourceType, SOURCE_TYPES, 'UNKNOWN'),
    sourceName: text(raw.sourceName, 120),
    sourceYear,
    sourceReference: optionalText(raw.sourceReference, 200),
    legacyId: optionalText(raw.legacyId, 128),
    authorName: raw.authorName === undefined ? 'Unknown' : text(raw.authorName, 200),
    authorType: enumValue(raw.authorType, AUTHOR_TYPES, 'UNKNOWN'),
    authorVerified:
      raw.authorVerified === undefined
        ? false
        : typeof raw.authorVerified === 'boolean'
          ? raw.authorVerified
          : (() => {
              throw invalid();
            })(),
    gradeLevel: optionalText(raw.gradeLevel, 50),
    difficulty:
      raw.difficulty === undefined || raw.difficulty === null
        ? null
        : enumValue(raw.difficulty, DIFFICULTIES, 'EASY'),
    explanation: optionalText(raw.explanation, 10000),
    imageUrl,
    imageStatus,
    imageHash: optionalText(raw.imageHash, 128),
    tags,
    options: options.sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export class Question {
  private constructor(
    readonly id: string,
    readonly version: number,
    readonly content: QuestionContent,
    readonly status: QuestionStatus,
    readonly options: readonly QuestionOption[],
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly publishedAt: Date | null,
  ) {}

  private static optionsFor(id: string, version: number, content: QuestionContent) {
    return content.options.map((option) => ({
      ...option,
      optionId: `${id}:${version}:${option.label}`,
    }));
  }

  static create(input: { questionId: string; content: QuestionContent; now: Date }): Question {
    if (typeof input.questionId !== 'string' || !input.questionId.trim()) throw invalid();
    return new Question(
      input.questionId,
      1,
      input.content,
      'IMPORTED',
      Question.optionsFor(input.questionId, 1, input.content),
      new Date(input.now),
      new Date(input.now),
      null,
    );
  }

  static restore(snapshot: QuestionSnapshot): Question {
    const { options, questionId, version, status, createdAt, updatedAt, publishedAt, ...content } =
      snapshot;
    return new Question(
      questionId,
      version,
      {
        ...content,
        options: options.map(({ label, content: value, isCorrect }) => ({
          label,
          content: value,
          isCorrect,
        })),
      },
      status,
      options,
      createdAt,
      updatedAt,
      publishedAt,
    );
  }

  get isPublished(): boolean {
    return this.status === 'PUBLISHED';
  }
  startReview(now: Date): Question {
    if (this.status !== 'IMPORTED' && this.status !== 'REJECTED')
      throw new QuestionsError('QST-005');
    return this.withStatus('IN_REVIEW', now);
  }
  update(content: QuestionContent, now: Date): Question {
    if (this.status === 'PUBLISHED' || this.status === 'ARCHIVED')
      throw new QuestionsError('QST-005');
    return new Question(
      this.id,
      this.version,
      content,
      this.status,
      Question.optionsFor(this.id, this.version, content),
      this.createdAt,
      new Date(now),
      null,
    );
  }
  approve(now: Date): Question {
    if (this.status !== 'IN_REVIEW') throw new QuestionsError('QST-005');
    return this.withStatus('APPROVED', now);
  }
  reject(now: Date): Question {
    if (this.status !== 'IN_REVIEW') throw new QuestionsError('QST-005');
    return this.withStatus('REJECTED', now);
  }
  returnToReview(now: Date): Question {
    if (this.status !== 'APPROVED' && this.status !== 'REJECTED')
      throw new QuestionsError('QST-005');
    return this.withStatus('IN_REVIEW', now);
  }
  publish(now: Date): Question {
    if (this.status !== 'APPROVED') throw new QuestionsError('QST-005');
    if (
      !this.content.explanation ||
      this.content.sourceType === 'UNKNOWN' ||
      !this.content.authorName ||
      (this.content.imageUrl && this.content.imageStatus !== 'VALID')
    )
      throw new QuestionsError('QST-005');
    return new Question(
      this.id,
      this.version,
      this.content,
      'PUBLISHED',
      this.options,
      this.createdAt,
      new Date(now),
      new Date(now),
    );
  }
  archive(now: Date): Question {
    if (this.status === 'ARCHIVED') throw new QuestionsError('QST-005');
    return this.withStatus('ARCHIVED', now);
  }
  private withStatus(status: QuestionStatus, now: Date): Question {
    return new Question(
      this.id,
      this.version,
      this.content,
      status,
      this.options,
      this.createdAt,
      new Date(now),
      this.publishedAt,
    );
  }
}

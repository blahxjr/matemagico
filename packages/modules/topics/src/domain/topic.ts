import { TopicsError } from './topics-error';

export const TOPIC_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

export interface TopicSnapshot {
  readonly topicId: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly status: TopicStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;

export function normalizeTopicSlug(raw: unknown): string {
  if (typeof raw !== 'string') throw new TopicsError('TOP-001');
  const slug = raw.trim().toLowerCase();
  if (slug.length < 2 || slug.length > 63 || !SLUG_PATTERN.test(slug)) {
    throw new TopicsError('TOP-001');
  }
  return slug;
}

function parseName(raw: unknown): string {
  if (typeof raw !== 'string') throw new TopicsError('TOP-001');
  const name = raw.trim();
  if (!name || name.length > MAX_NAME_LENGTH) throw new TopicsError('TOP-001');
  return name;
}

function parseDescription(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw !== 'string') throw new TopicsError('TOP-001');
  const description = raw.trim();
  if (description.length > MAX_DESCRIPTION_LENGTH) throw new TopicsError('TOP-001');
  return description;
}

export class Topic {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly description: string,
    readonly status: TopicStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(input: {
    topicId: string;
    name: unknown;
    slug: unknown;
    description?: unknown;
    now: Date;
  }): Topic {
    if (typeof input.topicId !== 'string' || !input.topicId.trim()) {
      throw new TopicsError('TOP-001');
    }
    return new Topic(
      input.topicId,
      parseName(input.name),
      normalizeTopicSlug(input.slug),
      parseDescription(input.description),
      'ACTIVE',
      new Date(input.now),
      new Date(input.now),
    );
  }

  static restore(snapshot: TopicSnapshot): Topic {
    return new Topic(
      snapshot.topicId,
      snapshot.name,
      snapshot.slug,
      snapshot.description,
      snapshot.status,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  get isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  /** The slug is a stable public identifier and cannot change. */
  update(changes: { name?: unknown; description?: unknown }, now: Date): Topic {
    if (changes.name === undefined && changes.description === undefined) {
      throw new TopicsError('TOP-001');
    }
    return new Topic(
      this.id,
      changes.name === undefined ? this.name : parseName(changes.name),
      this.slug,
      changes.description === undefined ? this.description : parseDescription(changes.description),
      this.status,
      this.createdAt,
      new Date(now),
    );
  }

  deactivate(now: Date): Topic {
    return new Topic(
      this.id,
      this.name,
      this.slug,
      this.description,
      'INACTIVE',
      this.createdAt,
      new Date(now),
    );
  }
}

import type { Topic, TopicStatus } from './topic';

export type AddTopicResult = 'CREATED' | 'CONFLICT';

export interface TopicRepository {
  add(topic: Topic): Promise<AddTopicResult>;
  findById(topicId: string): Promise<Topic | null>;
  /** Expects an already normalized slug. */
  findBySlug(slug: string): Promise<Topic | null>;
  list(filter: { status?: TopicStatus }): Promise<Topic[]>;
  save(topic: Topic): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface TopicIdGenerator {
  next(): string;
}

export { Topic, normalizeTopicSlug, TOPIC_STATUSES } from './domain/topic';
export type { TopicSnapshot, TopicStatus } from './domain/topic';
export { TopicsError } from './domain/topics-error';
export type { TopicsErrorCode } from './domain/topics-error';
export type { AddTopicResult, Clock, TopicIdGenerator, TopicRepository } from './domain/ports';
export {
  CreateTopicService,
  DeactivateTopicService,
  GetTopicService,
  ListTopicsService,
  TopicDirectory,
  UpdateTopicService,
} from './application/topic.services';
export type { TopicView } from './application/topic.services';
export { PrismaTopicRepository } from './infrastructure/prisma-topic.repository';
export { InMemoryTopicRepository } from './infrastructure/in-memory-topic.repository';

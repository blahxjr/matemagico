import { Topic, normalizeTopicSlug, TOPIC_STATUSES, type TopicStatus } from '../domain/topic';
import type { Clock, TopicIdGenerator, TopicRepository } from '../domain/ports';
import { TopicsError } from '../domain/topics-error';

export interface TopicView {
  readonly topicId: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly status: TopicStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const toView = (topic: Topic): TopicView => ({
  topicId: topic.id,
  name: topic.name,
  slug: topic.slug,
  description: topic.description,
  status: topic.status,
  createdAt: topic.createdAt,
  updatedAt: topic.updatedAt,
});

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof TopicsError) throw error;
    throw new TopicsError('TOP-004');
  }
}

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim();

export class CreateTopicService {
  constructor(
    private readonly deps: { topics: TopicRepository; clock: Clock; ids: TopicIdGenerator },
  ) {}

  async execute(input: { name: string; slug: string; description?: string }): Promise<TopicView> {
    const topic = Topic.create({
      topicId: this.deps.ids.next(),
      name: input?.name,
      slug: input?.slug,
      description: input?.description,
      now: this.deps.clock.now(),
    });
    const existing = await guard(() => this.deps.topics.findBySlug(topic.slug));
    if (existing) throw new TopicsError('TOP-003');
    const result = await guard(() => this.deps.topics.add(topic));
    if (result === 'CONFLICT') throw new TopicsError('TOP-003');
    return toView(topic);
  }
}

export class UpdateTopicService {
  constructor(private readonly deps: { topics: TopicRepository; clock: Clock }) {}

  async execute(input: {
    topicId: string;
    name?: string;
    description?: string;
  }): Promise<TopicView> {
    if (isBlank(input?.topicId)) throw new TopicsError('TOP-001');
    const topic = await guard(() => this.deps.topics.findById(input.topicId));
    if (!topic) throw new TopicsError('TOP-002');
    const updated = topic.update(
      { name: input.name, description: input.description },
      this.deps.clock.now(),
    );
    await guard(() => this.deps.topics.save(updated));
    return toView(updated);
  }
}

export class DeactivateTopicService {
  constructor(private readonly deps: { topics: TopicRepository; clock: Clock }) {}

  async execute(input: { topicId: string }): Promise<TopicView> {
    if (isBlank(input?.topicId)) throw new TopicsError('TOP-001');
    const topic = await guard(() => this.deps.topics.findById(input.topicId));
    if (!topic) throw new TopicsError('TOP-002');
    if (!topic.isActive) return toView(topic);
    const deactivated = topic.deactivate(this.deps.clock.now());
    await guard(() => this.deps.topics.save(deactivated));
    return toView(deactivated);
  }
}

export class GetTopicService {
  constructor(private readonly deps: { topics: TopicRepository }) {}

  async execute(input: { topicId: string }): Promise<TopicView> {
    if (isBlank(input?.topicId)) throw new TopicsError('TOP-001');
    const topic = await guard(() => this.deps.topics.findById(input.topicId));
    if (!topic) throw new TopicsError('TOP-002');
    return toView(topic);
  }
}

export class ListTopicsService {
  constructor(private readonly deps: { topics: TopicRepository }) {}

  async execute(input: { status?: TopicStatus } = {}): Promise<TopicView[]> {
    if (input.status !== undefined && !TOPIC_STATUSES.includes(input.status)) {
      throw new TopicsError('TOP-001');
    }
    const topics = await guard(() => this.deps.topics.list({ status: input.status }));
    return topics.map(toView);
  }
}

/** Public Topics contract consumed by other modules (Questions). */
export class TopicDirectory {
  constructor(private readonly topics: TopicRepository) {}

  async isActiveTopic(topicId: string): Promise<boolean> {
    const topic = await this.topics.findById(topicId);
    return topic?.isActive ?? false;
  }

  async findActiveTopicIdBySlug(slug: string): Promise<string | null> {
    const topic = await this.topics.findBySlug(normalizeTopicSlug(slug));
    return topic?.isActive ? topic.id : null;
  }
}

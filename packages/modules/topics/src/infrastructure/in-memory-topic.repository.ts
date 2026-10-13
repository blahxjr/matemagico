import type { AddTopicResult, TopicRepository } from '../domain/ports';
import type { Topic, TopicStatus } from '../domain/topic';

export class InMemoryTopicRepository implements TopicRepository {
  private readonly byId = new Map<string, Topic>();

  async add(topic: Topic): Promise<AddTopicResult> {
    for (const existing of this.byId.values()) {
      if (existing.slug === topic.slug || existing.id === topic.id) return 'CONFLICT';
    }
    this.byId.set(topic.id, topic);
    return 'CREATED';
  }

  async findById(topicId: string): Promise<Topic | null> {
    return this.byId.get(topicId) ?? null;
  }

  async findBySlug(slug: string): Promise<Topic | null> {
    for (const topic of this.byId.values()) if (topic.slug === slug) return topic;
    return null;
  }

  async list(filter: { status?: TopicStatus }): Promise<Topic[]> {
    return [...this.byId.values()]
      .filter((topic) => !filter.status || topic.status === filter.status)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async save(topic: Topic): Promise<void> {
    this.byId.set(topic.id, topic);
  }
}

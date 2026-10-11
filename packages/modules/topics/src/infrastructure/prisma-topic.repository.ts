import type { PrismaClient } from '@prisma/client';
import type { AddTopicResult, TopicRepository } from '../domain/ports';
import { Topic, type TopicStatus } from '../domain/topic';

export class PrismaTopicRepository implements TopicRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async add(topic: Topic): Promise<AddTopicResult> {
    try {
      await this.prisma.topic.create({
        data: {
          topicId: topic.id,
          name: topic.name,
          slug: topic.slug,
          description: topic.description,
          status: topic.status,
          createdAt: topic.createdAt,
          updatedAt: topic.updatedAt,
        },
      });
      return 'CREATED';
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') return 'CONFLICT';
      throw error;
    }
  }

  async findById(topicId: string): Promise<Topic | null> {
    const record = await this.prisma.topic.findUnique({ where: { topicId } });
    return record ? Topic.restore(record) : null;
  }

  async findBySlug(slug: string): Promise<Topic | null> {
    const record = await this.prisma.topic.findUnique({ where: { slug } });
    return record ? Topic.restore(record) : null;
  }

  async list(filter: { status?: TopicStatus }): Promise<Topic[]> {
    const records = await this.prisma.topic.findMany({
      where: filter.status ? { status: filter.status } : {},
      orderBy: [{ name: 'asc' }, { topicId: 'asc' }],
    });
    return records.map((record) => Topic.restore(record));
  }

  async save(topic: Topic): Promise<void> {
    await this.prisma.topic.update({
      where: { topicId: topic.id },
      data: {
        name: topic.name,
        description: topic.description,
        status: topic.status,
        updatedAt: topic.updatedAt,
      },
    });
  }
}

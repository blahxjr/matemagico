import { Question } from '../domain/question';
import type { AddQuestionResult, Page, QuestionFilter, QuestionRepository } from '../domain/ports';

export class InMemoryQuestionRepository implements QuestionRepository {
  private readonly versions = new Map<string, Question[]>();

  private all(): Question[] {
    return [...this.versions.values()].flat();
  }

  async add(question: Question): Promise<AddQuestionResult> {
    if (this.versions.has(question.id)) return 'CONFLICT';
    this.versions.set(question.id, [question]);
    return 'CREATED';
  }

  async addVersion(question: Question): Promise<AddQuestionResult> {
    const list = this.versions.get(question.id) ?? [];
    if (list.some((existing) => existing.version === question.version)) return 'CONFLICT';
    list.push(question);
    this.versions.set(question.id, list);
    return 'CREATED';
  }

  async findCurrent(questionId: string): Promise<Question | null> {
    const list = this.versions.get(questionId);
    if (!list?.length) return null;
    return list.reduce((a, b) => (b.version > a.version ? b : a));
  }

  async findVersion(questionId: string, version: number): Promise<Question | null> {
    return this.versions.get(questionId)?.find((q) => q.version === version) ?? null;
  }

  async findPublished(questionId: string): Promise<Question | null> {
    return this.versions.get(questionId)?.find((q) => q.isPublished) ?? null;
  }

  private replace(question: Question) {
    const list = this.versions.get(question.id) ?? [];
    this.versions.set(
      question.id,
      list.map((existing) => (existing.version === question.version ? question : existing)),
    );
  }

  async saveStatus(question: Question): Promise<void> {
    this.replace(question);
  }

  async save(question: Question): Promise<void> {
    this.replace(question);
  }

  async publish(question: Question): Promise<void> {
    const list = this.versions.get(question.id) ?? [];
    this.versions.set(
      question.id,
      list.map((existing) =>
        existing.version !== question.version && existing.isPublished
          ? existing.archive(question.updatedAt)
          : existing,
      ),
    );
    this.replace(question);
  }

  async list(filter: QuestionFilter, page: Page) {
    const rows =
      filter.status === 'PUBLISHED'
        ? this.all().filter((q) => q.isPublished)
        : [...this.versions.keys()]
            .map((id) => this.versionsOf(id))
            .filter((q): q is Question => q !== null)
            .filter((q) => !filter.status || q.status === filter.status);
    const matched = rows
      .filter((q) => !filter.level || q.content.level === filter.level)
      .filter((q) => !filter.topicId || q.content.topicId === filter.topicId)
      .filter((q) => filter.sourceYear === undefined || q.content.sourceYear === filter.sourceYear)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    return { items: matched.slice(page.offset, page.offset + page.limit), total: matched.length };
  }

  private versionsOf(id: string): Question | null {
    const list = this.versions.get(id);
    return list?.length ? list.reduce((a, b) => (b.version > a.version ? b : a)) : null;
  }

  async existsBySource(source: {
    sourceName: string;
    sourceYear: number | null;
    sourceReference: string;
  }): Promise<boolean> {
    return this.all().some(
      (q) =>
        q.content.sourceName === source.sourceName &&
        q.content.sourceYear === source.sourceYear &&
        q.content.sourceReference === source.sourceReference,
    );
  }

  async existsByFingerprint(fingerprint: string): Promise<boolean> {
    return this.all().some((question) => fingerprintFor(question) === fingerprint);
  }

  async countByStatus(): Promise<Record<import('../domain/question').QuestionStatus, number>> {
    const statuses = [
      'IMPORTED',
      'IN_REVIEW',
      'APPROVED',
      'PUBLISHED',
      'REJECTED',
      'ARCHIVED',
    ] as const;
    return Object.fromEntries(
      statuses.map((status) => [
        status,
        this.all().filter((question) => question.status === status).length,
      ]),
    ) as Record<import('../domain/question').QuestionStatus, number>;
  }
}

function fingerprintFor(question: Question): string {
  const options = [...question.options]
    .sort((left, right) => left.label.localeCompare(right.label))
    .map((option) => option.content.trim().toLowerCase())
    .join('\u001e');
  const answer = question.options.find((option) => option.isCorrect)?.label ?? '';
  return [question.content.statement.trim().toLowerCase(), options, answer].join('\u001f');
}

import type { AddSchoolResult, SchoolRepository } from '../domain/ports';
import type { School } from '../domain/school';

export class InMemorySchoolRepository implements SchoolRepository {
  private readonly byId = new Map<string, School>();

  async add(school: School): Promise<AddSchoolResult> {
    for (const existing of this.byId.values()) {
      if (existing.slug === school.slug || existing.id === school.id) return 'CONFLICT';
    }
    this.byId.set(school.id, school);
    return 'CREATED';
  }

  async findById(schoolId: string): Promise<School | null> {
    return this.byId.get(schoolId) ?? null;
  }

  async findBySlug(slug: string): Promise<School | null> {
    for (const school of this.byId.values()) if (school.slug === slug) return school;
    return null;
  }

  async save(school: School): Promise<void> {
    this.byId.set(school.id, school);
  }
}

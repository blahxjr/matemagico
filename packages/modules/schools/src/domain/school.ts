import { SchoolsError } from './schools-error';

export const SCHOOL_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

export interface SchoolSnapshot {
  readonly schoolId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: SchoolStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 160;

export function normalizeSlug(raw: unknown): string {
  if (typeof raw !== 'string') throw new SchoolsError('SCH-001');
  const slug = raw.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 63 || !SLUG_PATTERN.test(slug)) {
    throw new SchoolsError('SCH-001');
  }
  return slug;
}

export class School {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly status: SchoolStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(input: { schoolId: string; name: unknown; slug: unknown; now: Date }): School {
    if (typeof input.schoolId !== 'string' || !input.schoolId.trim()) {
      throw new SchoolsError('SCH-001');
    }
    if (typeof input.name !== 'string') throw new SchoolsError('SCH-001');
    const name = input.name.trim();
    if (!name || name.length > MAX_NAME_LENGTH) throw new SchoolsError('SCH-001');
    return new School(
      input.schoolId,
      name,
      normalizeSlug(input.slug),
      'ACTIVE',
      new Date(input.now),
      new Date(input.now),
    );
  }

  static restore(snapshot: SchoolSnapshot): School {
    return new School(
      snapshot.schoolId,
      snapshot.name,
      snapshot.slug,
      snapshot.status,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  get isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  deactivate(now: Date): School {
    return new School(this.id, this.name, this.slug, 'INACTIVE', this.createdAt, new Date(now));
  }
}

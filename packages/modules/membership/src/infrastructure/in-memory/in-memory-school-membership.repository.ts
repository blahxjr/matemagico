import type { SchoolMembership } from '../../domain/entities/school-membership';
import type {
  AddMembershipResult,
  SchoolMembershipRepository,
} from '../../domain/repositories/school-membership.repository';
import type { MembershipId, SchoolId, UserId } from '../../domain/value-objects/identifiers';

export class InMemorySchoolMembershipRepository implements SchoolMembershipRepository {
  readonly store = new Map<string, SchoolMembership>();
  failing = false;

  async findById(id: MembershipId): Promise<SchoolMembership | null> {
    this.assertAvailable();
    return this.store.get(id) ?? null;
  }

  async findOpenByUserAndSchool(
    userId: UserId,
    schoolId: SchoolId,
  ): Promise<SchoolMembership | null> {
    this.assertAvailable();
    return (
      [...this.store.values()].find(
        (m) => m.userId === userId && m.schoolId === schoolId && m.isOpen,
      ) ?? null
    );
  }

  async listByUserAndSchool(
    userId: UserId,
    schoolId: SchoolId,
  ): Promise<readonly SchoolMembership[]> {
    this.assertAvailable();
    return [...this.store.values()].filter((m) => m.userId === userId && m.schoolId === schoolId);
  }

  async add(membership: SchoolMembership): Promise<AddMembershipResult> {
    this.assertAvailable();
    const conflict = [...this.store.values()].some(
      (m) => m.userId === membership.userId && m.schoolId === membership.schoolId && m.isOpen,
    );
    if (conflict || this.store.has(membership.id)) return 'CONFLICT';
    this.store.set(membership.id, membership);
    return 'CREATED';
  }

  async activate(id: MembershipId, activatedAt: Date): Promise<boolean> {
    this.assertAvailable();
    const current = this.store.get(id);
    if (!current || current.state !== 'PENDING') return false;
    this.store.set(id, current.activate(activatedAt));
    return true;
  }

  private assertAvailable(): void {
    if (this.failing) throw new Error('membership store unavailable');
  }
}

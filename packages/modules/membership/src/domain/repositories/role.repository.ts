import type { Role } from '../entities/role';
import type { RoleId, SchoolId, UserId } from '../value-objects/identifiers';

export interface RoleRepository {
  /** Catalog lookup; null when the Role does not exist. */
  findById(id: RoleId): Promise<Role | null>;
  /** Whether the Role is in the allowlist the actor may grant in the School. */
  isGrantableByActor(actorUserId: UserId, schoolId: SchoolId, roleId: RoleId): Promise<boolean>;
}

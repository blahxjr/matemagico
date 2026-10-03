import { MembershipDomainError } from '../errors/membership-domain-error';
import { roleId, type RoleId } from '../value-objects/identifiers';

export type RoleScope = 'SCHOOL' | 'GLOBAL';
export type RoleCatalogStatus = 'APPROVED' | 'REMOVED';

export interface RoleSnapshot {
  readonly roleId: string;
  readonly code: string;
  readonly scope: RoleScope;
  readonly status: RoleCatalogStatus;
  /** Privileged Roles (SCHOOL_ADMIN) require a second approval to be granted. */
  readonly privileged: boolean;
}

/** Catalog Role: read-only here. Permissions are derived elsewhere and never held by the Role in this slice. */
export class Role {
  private constructor(
    readonly id: RoleId,
    readonly code: string,
    readonly scope: RoleScope,
    readonly status: RoleCatalogStatus,
    readonly privileged: boolean,
  ) {}

  static restore(snapshot: RoleSnapshot): Role {
    if (!snapshot.code?.trim()) throw new MembershipDomainError('Role code must not be empty.');
    if (snapshot.scope !== 'SCHOOL' && snapshot.scope !== 'GLOBAL') {
      throw new MembershipDomainError('Role scope must be SCHOOL or GLOBAL.');
    }
    return new Role(
      roleId(snapshot.roleId),
      snapshot.code,
      snapshot.scope,
      snapshot.status,
      snapshot.privileged,
    );
  }

  /** Only approved (not removed) school-scoped Roles can be granted. */
  get isGrantableInSchool(): boolean {
    return this.scope === 'SCHOOL' && this.status === 'APPROVED';
  }
}

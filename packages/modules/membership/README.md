# Membership

Implements `SchoolMembership`, `SchoolMembershipRepository`, `CreateMembershipService`
(CP-MEM-001) and `ActivateMembershipService` (CP-MEM-002). User and School are referenced by id and
resolved through the public contracts of their owners. No Role, Grant or
Permission is created here.

## Structure

- `src/domain`: `SchoolMembership`, identifiers, repository port.
- `src/application`: `CreateMembershipService`, `MembershipError` (`MEM-001`–`MEM-005`) and ports
  (`ActorAuthorizer`, `UserDirectory`, `SchoolDirectory`, `Clock`, `MembershipIdGenerator`).
- `src/infrastructure/in-memory`: repository used by integration tests.

## Error mapping (MEMBERSHIP-API-CONTRACTS.md)

| Situation                                                                          | Code      |
| ---------------------------------------------------------------------------------- | --------- |
| Duplicate open (`PENDING`/`ACTIVE`) Membership for the User–School pair            | `MEM-001` |
| User missing, not active or not verifiable                                         | `MEM-002` |
| School missing, not enabled or not verifiable                                      | `MEM-003` |
| Actor not authorized, no authenticated context, Membership persistence unavailable | `MEM-005` |

`MEM-004` is reserved for Role/Grant scenarios.

ActivateMembership: missing or non-`PENDING` Membership → `MEM-001`; User not active or not
verifiable → `MEM-002`; School not enabled or not verifiable → `MEM-003`; actor not authorized in
the Membership's School, authorizer/repository/event failure → `MEM-005`.

GrantRole: Membership missing or not `ACTIVE` -> `MEM-001`; School not enabled/verifiable -> `MEM-003`; Role unknown/removed/global/outside the actor allowlist, live duplicate Grant, invalid validity, missing or invalid second approval for `SCHOOL_ADMIN` -> `MEM-004`; actor not authorized, self-elevation, or any dependency failure -> `MEM-005`. No Permission is computed.

## School Context (CP-SC-001)

`ResolveSchoolContextService` returns a candidate context (userId, membershipId, canonical schoolId, resolvedAt) and no Permission. `ResolvePermissionsService` re-resolves that context and derives Permissions only from effective Grants -> approved school Roles -> RolePermission. Errors follow SCHOOL-CONTEXT-MVP.md: `SC-001` Session/User, `SC-002` Membership, `SC-003` School, `SC-004` Grant/Role/Permission, `SC-005` unavailable dependency. No cache, no persistence of the context.

## Prisma adapters

`SchoolMembershipPrismaRepository`, `RolePrismaRepository`, `GrantPrismaRepository` and `PermissionPrismaRepository` implement the repository ports on PostgreSQL (schema and migration in `packages/database`).

- At most one open (`PENDING`/`ACTIVE`) Membership per User–School pair is enforced by a partial unique index; `add` maps the violation to `CONFLICT`.
- `GrantRepository.add` checks and inserts under `SERIALIZABLE` (retrying serialization failures) so concurrent grants for one Membership–Role pair cannot both succeed.
- Any other database failure propagates, so the services fail closed.

The repository contract suite runs against the in-memory and the Prisma implementations. The Prisma part runs only when `TEST_DATABASE_URL` points to a migrated, disposable database (`npx prisma migrate deploy` in `packages/database`); it deletes the data of the Membership tables.

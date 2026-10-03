# Auth Persistence Foundation

This package contains only the AuthAccount, PasswordCredential, and Session
domain models, repository contracts, and Prisma persistence adapters. User is
represented only by its externally owned `userId`.

Login, logout, session lookup/application services, Membership, and School
Context are intentionally not implemented in this slice.

## Structure

- `src/domain/entities`: AuthAccount, PasswordCredential, and Session.
- `src/domain/value-objects`: Auth-owned identifiers and password hash metadata.
- `src/domain/policies`: active-session limit and eviction ordering.
- `src/domain/repositories`: persistence ports.
- `src/infrastructure/persistence/prisma`: Prisma implementations and mapping.

## Persistence

The Auth models live in the shared Prisma schema. This slice does not create a
database or apply migrations. AuthAccount references Users only by `userId`;
there is no Auth-owned User model or cross-owner relation.

## Test criteria

- Reject blank identifiers, unsupported Auth providers, malformed password
  hash material, invalid Argon2id cost metadata, and inconsistent Session
  timestamps.
- Keep encoded password hashes out of default JSON serialization.
- Enforce the eight-hour absolute and 30-minute idle Session limits, including
  their expiration boundaries.
- Select the oldest active Session by `createdAt`, then lexical `sessionId`,
  when creating a Session over the five-active-session limit.
- Make eviction and Session creation one transaction so a failed create does
  not leave the old Session revoked.

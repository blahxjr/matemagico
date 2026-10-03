import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import {
  AuthenticateUserService,
  GetSessionService,
  AuthAccountPrismaRepository,
  PasswordCredentialPrismaRepository,
  SessionPrismaRepository,
} from '@matemagico/auth';
import {
  ActivateMembershipService,
  CreateMembershipService,
  GrantPrismaRepository,
  GrantRoleService,
  PermissionPrismaRepository,
  ResolvePermissionsService,
  ResolveSchoolContextService,
  RolePrismaRepository,
  SchoolMembershipPrismaRepository,
  ValidateSchoolContextService,
} from '@matemagico/membership';
import { createCompositionRoot, noUserDirectory } from './index';

// PrismaClient connects lazily, so composition needs no database.
const prisma = new PrismaClient({ datasourceUrl: 'postgresql://x:x@127.0.0.1:1/x' });
afterAll(() => prisma.$disconnect());

const clientOf = (repository: object) => (repository as { prisma: PrismaClient }).prisma;

describe('composition root', () => {
  const root = createCompositionRoot(prisma);

  it('instantiates every application service', () => {
    expect(root.services.authenticateUser).toBeInstanceOf(AuthenticateUserService);
    expect(root.services.getSession).toBeInstanceOf(GetSessionService);
    expect(root.services.createMembership).toBeInstanceOf(CreateMembershipService);
    expect(root.services.activateMembership).toBeInstanceOf(ActivateMembershipService);
    expect(root.services.grantRole).toBeInstanceOf(GrantRoleService);
    expect(root.services.resolveSchoolContext).toBeInstanceOf(ResolveSchoolContextService);
    expect(root.services.resolvePermissions).toBeInstanceOf(ResolvePermissionsService);
    expect(root.services.validateSchoolContext).toBeInstanceOf(ValidateSchoolContextService);
  });

  it('uses the Prisma adapter for every persistence port', () => {
    const { repositories } = root;
    expect(repositories.authAccounts).toBeInstanceOf(AuthAccountPrismaRepository);
    expect(repositories.passwordCredentials).toBeInstanceOf(PasswordCredentialPrismaRepository);
    expect(repositories.sessions).toBeInstanceOf(SessionPrismaRepository);
    expect(repositories.memberships).toBeInstanceOf(SchoolMembershipPrismaRepository);
    expect(repositories.roles).toBeInstanceOf(RolePrismaRepository);
    expect(repositories.grants).toBeInstanceOf(GrantPrismaRepository);
    expect(repositories.permissions).toBeInstanceOf(PermissionPrismaRepository);
  });

  it('shares one PrismaClient across all adapters', () => {
    expect(root.prisma).toBe(prisma);
    for (const repository of Object.values(root.repositories)) {
      expect(clientOf(repository)).toBe(prisma);
    }
  });

  it('shares the same repository instances between services', () => {
    const deps = (service: object) => (service as { deps: Record<string, unknown> }).deps;
    expect(deps(root.services.grantRole).memberships).toBe(root.repositories.memberships);
    expect(deps(root.services.grantRole).grants).toBe(root.repositories.grants);
    expect(deps(root.services.resolvePermissions).grants).toBe(root.repositories.grants);
    expect(deps(root.services.resolvePermissions).schoolContext).toBe(
      root.services.resolveSchoolContext,
    );
    expect(deps(root.services.validateSchoolContext).memberships).toBe(
      root.repositories.memberships,
    );
    expect(deps(root.services.authenticateUser).sessions).toBe(root.repositories.sessions);
  });

  it('fails closed with the provisional ports', async () => {
    await expect(
      root.services.createMembership.execute({
        actor: { userId: 'u1' },
        userId: 'u2',
        schoolId: 's1',
      } as never),
    ).rejects.toMatchObject({ code: 'MEM-005' });
  });

  it('accepts overrides for the provisional ports', () => {
    const custom = { isActiveUser: async () => true };
    const overridden = createCompositionRoot(prisma, { userDirectory: custom });
    const deps = (
      overridden.services.resolveSchoolContext as unknown as {
        deps: { users: unknown };
      }
    ).deps;
    expect(deps.users).toBe(custom);
    expect(deps.users).not.toBe(noUserDirectory);
  });
});

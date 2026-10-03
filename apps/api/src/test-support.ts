import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { PrismaClient } from '@prisma/client';
import type { PasswordVerifier, UserIdentity, UserRepository } from '@matemagico/auth';
import type { ActorAuthorizer, SchoolDirectory, UserDirectory } from '@matemagico/membership';
import { createCompositionRoot, type CompositionOverrides } from '@matemagico/composition-root';
import { createApp } from './app';

/** Prisma double that proves whether the database was touched. */
export function fakePrisma(query: () => Promise<unknown>) {
  const calls = { count: 0 };
  const prisma = {
    $queryRaw: () => {
      calls.count += 1;
      return query();
    },
  } as unknown as PrismaClient;
  return { prisma, calls };
}

export async function startApp(prisma: PrismaClient, overrides?: CompositionOverrides) {
  const server: Server = createApp(createCompositionRoot(prisma, overrides));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** The Users module does not exist yet: this is its public identity contract, seen by Auth. */
export const USERS: Record<string, UserIdentity> = {
  'ana@example.com': { userId: 'user-1' as UserIdentity['userId'], status: 'ACTIVE' },
  'bia@example.com': { userId: 'user-2' as UserIdentity['userId'], status: 'ACTIVE' },
};

export const usersPort: UserRepository = {
  findByNormalizedEmail: async (email) => USERS[email] ?? null,
  findByUserId: async (id) => Object.values(USERS).find((user) => user.userId === id) ?? null,
};

export const PASSWORD = 'secret';

/** Stands in for the Argon2id adapter, which is still technical debt. */
export const verifierPort: PasswordVerifier = {
  verify: async (plain) => plain === PASSWORD,
};

export const authPorts: CompositionOverrides = {
  userRepository: usersPort,
  passwordVerifier: verifierPort,
};

export const databaseUrl = process.env.TEST_DATABASE_URL;

export const unreachablePrisma = () =>
  new PrismaClient({ datasourceUrl: 'postgresql://x:x@127.0.0.1:1/x?connect_timeout=1' });

export async function seedAccount(prisma: PrismaClient, userId: string, email: string) {
  await prisma.authAccount.create({
    data: { authAccountId: `account-${userId}`, userId, provider: 'credentials', subject: email },
  });
  await prisma.passwordCredential.create({
    data: {
      passwordCredentialId: `credential-${userId}`,
      authAccountId: `account-${userId}`,
      encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$c2FsdA$aGFzaA',
      hashAlgorithm: 'ARGON2ID',
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
      passwordChangedAt: new Date('2026-01-01T12:00:00.000Z'),
    },
  });
}

export async function resetAuthTables(prisma: PrismaClient) {
  await prisma.passwordCredential.deleteMany();
  await prisma.authAccount.deleteMany();
  await prisma.session.deleteMany();
}

export const postJson = (url: string, body: unknown, raw = false) =>
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });

/* Membership: the Users, Schools and ActorAuthorizer contracts are still provisional (tech debt). */
export const ADMIN = 'admin-1';
export const SCHOOL = 'school-1';
export const KNOWN_USERS = new Set(['user-1', 'user-2', ADMIN]);

export const membershipPorts: CompositionOverrides = {
  userDirectory: { isActiveUser: async (id) => KNOWN_USERS.has(id) } satisfies UserDirectory,
  schoolDirectory: {
    isEnabledSchool: async (id) => id === SCHOOL,
  } satisfies SchoolDirectory,
  actorAuthorizer: {
    canAdministerSchool: async (actor, schoolId) => actor.userId === ADMIN && schoolId === SCHOOL,
  } satisfies ActorAuthorizer,
};

export async function resetMembershipTables(prisma: PrismaClient) {
  await prisma.grant.deleteMany();
  await prisma.roleGrantAllowlist.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.schoolMembership.deleteMany();
}

export async function seedTeacherRole(prisma: PrismaClient) {
  await prisma.role.create({
    data: {
      roleId: 'teacher',
      code: 'TEACHER',
      scope: 'SCHOOL',
      status: 'APPROVED',
      privileged: false,
    },
  });
  await prisma.roleGrantAllowlist.create({
    data: { actorUserId: ADMIN, schoolId: SCHOOL, roleId: 'teacher' },
  });
}

export async function seedMembership(
  prisma: PrismaClient,
  membershipId: string,
  userId: string,
  state: 'PENDING' | 'ACTIVE',
) {
  const now = new Date();
  await prisma.schoolMembership.create({
    data: {
      membershipId,
      userId,
      schoolId: SCHOOL,
      state,
      createdAt: now,
      activatedAt: state === 'ACTIVE' ? now : null,
    },
  });
}

export const post = (url: string, body: unknown) => postJson(url, body);

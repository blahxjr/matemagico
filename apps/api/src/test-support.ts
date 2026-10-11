import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { PrismaClient } from '@prisma/client';
import {
  createCompositionRoot,
  type CompositionOverrides,
  type CompositionRoot,
} from '@matemagico/composition-root';
import { createApp, type AppOptions } from './app';

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

export async function startApp(
  prisma: PrismaClient,
  overrides?: CompositionOverrides,
  options?: AppOptions,
) {
  const root: CompositionRoot = createCompositionRoot(prisma, overrides);
  const server: Server = createApp(root, options);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    root,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export type App = Awaited<ReturnType<typeof startApp>>;

export const PASSWORD = 'correct-horse-battery';
export const databaseUrl = process.env.TEST_DATABASE_URL;

export const unreachablePrisma = () =>
  new PrismaClient({ datasourceUrl: '******127.0.0.1:1/x?connect_timeout=1' });

export const postJson = (url: string, body: unknown, raw = false, token?: string) =>
  fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: raw ? (body as string) : JSON.stringify(body),
  });

export const getJson = (url: string, token?: string) =>
  fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });

/** Idempotent official Roles/Permissions, as seeded by `npm run seed`. */
export async function ensureRoles(prisma: PrismaClient): Promise<void> {
  const questionPermissions = [
    'question:create',
    'question:update',
    'question:publish',
    'exam:create',
    'exam:publish',
  ];
  const roles = [
    ['STUDENT', false, ['school:read']],
    ['TEACHER', false, ['school:read', ...questionPermissions]],
    [
      'SCHOOL_ADMIN',
      true,
      [
        'membership:create',
        'membership:activate',
        'role:grant',
        'school:read',
        'school:update',
        ...questionPermissions,
      ],
    ],
  ] as const;
  // Test files run in parallel: skipDuplicates keeps the seed idempotent under concurrency.
  for (const [roleId, privileged, permissions] of roles) {
    await prisma.role.createMany({
      data: [{ roleId, code: roleId, scope: 'SCHOOL', status: 'APPROVED', privileged }],
      skipDuplicates: true,
    });
    await prisma.rolePermission.createMany({
      data: permissions.map((permissionCode) => ({ roleId, permissionCode })),
      skipDuplicates: true,
    });
  }
}

export interface TestUser {
  readonly userId: string;
  readonly email: string;
  readonly token: string;
}

/** Registers and logs in a real User through the public API; every test uses unique data. */
export async function signUp(app: App, label: string): Promise<TestUser> {
  const email = `${label}-${randomUUID().slice(0, 8)}@escola.test`;
  const registered = await postJson(`${app.url}/auth/register`, {
    email,
    name: label,
    password: PASSWORD,
  });
  if (registered.status !== 201) throw new Error(`register failed: ${registered.status}`);
  const { userId } = (await registered.json()) as { userId: string };
  const login = await postJson(`${app.url}/auth/login`, { email, password: PASSWORD });
  if (login.status !== 200) throw new Error(`login failed: ${login.status}`);
  const { sessionId } = (await login.json()) as { sessionId: string };
  return { userId, email, token: sessionId };
}

/** The founder creates a School through POST /schools and becomes its SCHOOL_ADMIN. */
export async function foundSchool(app: App, founder: TestUser): Promise<string> {
  const slug = `escola-${randomUUID().slice(0, 8)}`;
  const res = await postJson(`${app.url}/schools`, { name: 'Escola', slug }, false, founder.token);
  if (res.status !== 201) throw new Error(`school failed: ${res.status}`);
  return ((await res.json()) as { schoolId: string }).schoolId;
}

export async function createMembership(
  app: App,
  actor: TestUser,
  userId: string,
  schoolId: string,
): Promise<string> {
  const res = await postJson(`${app.url}/memberships`, { userId, schoolId }, false, actor.token);
  if (res.status !== 201) throw new Error(`membership failed: ${res.status}`);
  return ((await res.json()) as { membershipId: string }).membershipId;
}

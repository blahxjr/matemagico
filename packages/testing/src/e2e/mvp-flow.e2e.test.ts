import { describe, expect, it } from 'vitest';
import {
  AuthAccount,
  AuthenticateUserService,
  GetSessionService,
  InMemoryLoginAttemptLimiter,
  PasswordCredential,
  sessionsToRevokeForNewSession,
  type PasswordVerifier,
  type Session,
  type SessionRepository,
  type UserIdentity,
  type UserRepository,
} from '@matemagico/auth';
import {
  ActivateMembershipService,
  CreateMembershipService,
  GrantRoleService,
  InMemoryGrantRepository,
  InMemoryPermissionRepository,
  InMemoryRoleRepository,
  InMemorySchoolMembershipRepository,
  ResolvePermissionsService,
  ResolveSchoolContextService,
  Role,
  RolePermission,
  SchoolMembership,
  ValidateSchoolContextService,
  type ActorAuthorizer,
  type MembershipEventPublisher,
  type SchoolDirectory,
  type UserDirectory,
} from '@matemagico/membership';

const NOW = new Date('2026-01-01T12:00:00.000Z');
const PASSWORD = 'correct-horse';
const SCHOOL = 'school-1';
const ACTION = 'class:create';

/** The Users module, seen by Auth (identity) and by Membership (UserDirectory) alike. */
class Users implements UserRepository, UserDirectory {
  readonly byId = new Map<string, { email: string; status: string }>();
  failing = false;
  async findByNormalizedEmail(email: string): Promise<UserIdentity | null> {
    if (this.failing) throw new Error('users unavailable');
    const found = [...this.byId].find(([, user]) => user.email === email);
    return found ? { userId: found[0] as UserIdentity['userId'], status: found[1].status } : null;
  }
  async findByUserId(userId: UserIdentity['userId']): Promise<UserIdentity | null> {
    if (this.failing) throw new Error('users unavailable');
    const found = this.byId.get(userId);
    return found ? { userId, status: found.status } : null;
  }
  async isActiveUser(userId: string): Promise<boolean> {
    if (this.failing) throw new Error('users unavailable');
    return this.byId.get(userId)?.status === 'ACTIVE';
  }
}

class Sessions implements SessionRepository {
  readonly store = new Map<string, Session>();
  failing = false;
  async findById(id: string) {
    if (this.failing) throw new Error('sessions unavailable');
    return this.store.get(id) ?? null;
  }
  async findActiveByUserId(userId: string, at: Date) {
    return [...this.store.values()].filter((s) => s.userId === userId && s.isActiveAt(at));
  }
  async createWithinActiveLimit(session: Session) {
    if (this.failing) throw new Error('sessions unavailable');
    const active = await this.findActiveByUserId(session.userId, session.createdAt);
    for (const { sessionId } of sessionsToRevokeForNewSession(
      active.map((s) => ({ sessionId: s.id, createdAt: s.createdAt })),
    )) {
      this.store.set(sessionId, this.store.get(sessionId)!.revoke(session.createdAt, 'limit'));
    }
    this.store.set(session.id, session);
    return session;
  }
  async recordActivity(): Promise<Session> {
    throw new Error('out of scope');
  }
  async revoke(): Promise<boolean> {
    throw new Error('out of scope');
  }
}

class Schools implements SchoolDirectory {
  readonly enabled = new Set<string>([SCHOOL]);
  failing = false;
  async isEnabledSchool(schoolId: string) {
    if (this.failing) throw new Error('schools unavailable');
    return this.enabled.has(schoolId);
  }
}

class Admins implements ActorAuthorizer {
  failing = false;
  async canAdministerSchool(actor: { userId: string }) {
    if (this.failing) throw new Error('authorization unavailable');
    return actor.userId === 'admin-1';
  }
}

const events: MembershipEventPublisher = {
  publishMembershipCreated: async () => undefined,
  publishRoleGranted: async () => undefined,
};

const teacher = (status: 'APPROVED' | 'REMOVED') =>
  Role.restore({
    roleId: 'teacher',
    code: 'TEACHER',
    scope: 'SCHOOL',
    status,
    privileged: false,
  });

function createPlatform() {
  const users = new Users();
  users.byId.set('user-1', { email: 'ana@example.com', status: 'ACTIVE' });
  const schools = new Schools();
  const admins = new Admins();
  const sessions = new Sessions();
  const clock = { now: () => NOW };

  const account = AuthAccount.create({
    authAccountId: 'account-1',
    userId: 'user-1',
    provider: 'credentials',
    subject: 'ana@example.com',
  });
  const credential = PasswordCredential.create({
    passwordCredentialId: 'credential-1',
    authAccountId: account.id,
    encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$c2FsdA$aGFzaA',
    hashParameters: { memoryCost: 65536, timeCost: 3, parallelism: 1 },
    passwordChangedAt: NOW,
  });
  const verifier: PasswordVerifier & { failing: boolean } = {
    failing: false,
    async verify(plain: string) {
      if (this.failing) throw new Error('verifier unavailable');
      return plain === PASSWORD;
    },
  };
  let sessionCounter = 0;
  const authenticate = new AuthenticateUserService({
    users,
    authAccounts: { findByUserId: async () => account },
    passwordCredentials: { findByAuthAccountId: async () => credential },
    sessions,
    passwordVerifier: verifier,
    attemptLimiter: new InMemoryLoginAttemptLimiter(),
    clock,
    sessionIds: { next: () => `session-${++sessionCounter}` },
  });
  const getSession = new GetSessionService({ sessions, users, clock });

  const memberships = new InMemorySchoolMembershipRepository();
  const roles = new InMemoryRoleRepository();
  roles.roles.set('teacher', teacher('APPROVED'));
  roles.allowlist.set('admin-1', new Set(['teacher']));
  const grants = new InMemoryGrantRepository();
  const permissions = new InMemoryPermissionRepository();
  permissions.associations.push(
    RolePermission.create({ roleId: 'teacher', permissionCode: 'class:read' }),
    RolePermission.create({ roleId: 'teacher', permissionCode: ACTION }),
  );

  let membershipCounter = 0;
  let grantCounter = 0;
  const create = new CreateMembershipService({
    memberships,
    actorAuthorizer: admins,
    users,
    schools,
    clock,
    membershipIds: { next: () => `membership-${++membershipCounter}` },
  });
  const activate = new ActivateMembershipService({
    memberships,
    actorAuthorizer: admins,
    users,
    schools,
    events,
    clock,
  });
  const grantRole = new GrantRoleService({
    memberships,
    roles,
    grants,
    actorAuthorizer: admins,
    schools,
    events,
    clock,
    grantIds: { next: () => `grant-${++grantCounter}` },
  });
  const resolveContext = new ResolveSchoolContextService({ memberships, users, schools, clock });
  const resolvePermissions = new ResolvePermissionsService({
    schoolContext: resolveContext,
    grants,
    roles,
    permissions,
    clock,
  });
  const validateContext = new ValidateSchoolContextService({ memberships, users, schools });

  const admin = { userId: 'admin-1' };
  const login = () =>
    authenticate.execute({ email: 'ana@example.com', password: PASSWORD, clientIp: '10.0.0.1' });

  /** Official flow. Returns AUTHORIZED or the error code that denied access. */
  async function run(
    options: {
      skipActivate?: boolean;
      skipGrant?: boolean;
      grantWindow?: { validFrom: Date; validUntil?: Date };
      afterGrant?: (membershipId: string) => void;
      afterContext?: () => void;
    } = {},
  ) {
    const trace: string[] = [];
    try {
      const auth = await login();
      trace.push(auth.result);
      const session = await getSession.execute({ sessionId: auth.sessionId });
      const actor = { userId: session.userId };

      const { membershipId } = await create.execute({
        userId: actor.userId,
        schoolId: SCHOOL,
        actor: admin,
      });
      trace.push('MEMBERSHIP_CREATED');
      if (!options.skipActivate) {
        await activate.execute({ membershipId, actor: admin });
        trace.push('MEMBERSHIP_ACTIVATED');
      }
      if (!options.skipGrant) {
        await grantRole.execute({
          membershipId,
          roleId: 'teacher',
          validFrom: NOW,
          ...options.grantWindow,
          actor: admin,
        });
        trace.push('ROLE_GRANTED');
      }
      options.afterGrant?.(membershipId);

      const context = await resolveContext.execute({ actor, schoolId: SCHOOL });
      trace.push(context.result);
      const resolved = await resolvePermissions.execute({
        actor,
        context: {
          userId: context.userId,
          schoolId: context.schoolId,
          membershipId: context.membershipId,
        },
        action: ACTION,
      });
      trace.push(resolved.result);

      options.afterContext?.();
      const valid = await validateContext.execute({ actor, context });
      trace.push(valid.result);
      return { outcome: 'AUTHORIZED' as const, trace, permissions: resolved.permissions };
    } catch (error) {
      return { outcome: (error as { code?: string }).code ?? 'UNEXPECTED', trace };
    }
  }

  return {
    run,
    users,
    schools,
    admins,
    sessions,
    verifier,
    memberships,
    roles,
    grants,
    permissions,
  };
}

type Platform = ReturnType<typeof createPlatform>;

describe('MVP end to end flow', () => {
  it('AuthenticateUser → … → ValidateSchoolContext ends AUTHORIZED', async () => {
    const p = createPlatform();
    const result = await p.run();
    expect(result).toEqual({
      outcome: 'AUTHORIZED',
      trace: [
        'AUTHENTICATED',
        'MEMBERSHIP_CREATED',
        'MEMBERSHIP_ACTIVATED',
        'ROLE_GRANTED',
        'CONTEXT_RESOLVED',
        'ALLOWED',
        'VALID',
      ],
      permissions: ['class:create', 'class:read'],
    });
  });

  it('E2E-001: a PENDING Membership is denied', async () => {
    const p = createPlatform();
    const result = await p.run({ skipActivate: true, skipGrant: true });
    expect(result.outcome).toBe('SC-002');
    expect(result.trace).not.toContain('CONTEXT_RESOLVED');
  });

  it('E2E-002: a REVOKED Membership is denied', async () => {
    const p = createPlatform();
    const result = await p.run({
      afterGrant: (membershipId) =>
        p.memberships.store.set(
          membershipId,
          SchoolMembership.restore({
            membershipId,
            userId: 'user-1',
            schoolId: SCHOOL,
            state: 'REVOKED',
            createdAt: NOW,
            activatedAt: NOW,
            revokedAt: NOW,
          }),
        ),
    });
    expect(result.outcome).toBe('SC-002');
    expect(result.trace).not.toContain('ALLOWED');
  });

  it('E2E-003: an expired Grant is denied', async () => {
    const p = createPlatform();
    const result = await p.run({
      grantWindow: {
        validFrom: new Date('2025-12-01T00:00:00.000Z'),
        validUntil: new Date('2025-12-31T00:00:00.000Z'),
      },
    });
    expect(result.outcome).toBe('SC-004');
    expect(result.trace).toContain('CONTEXT_RESOLVED');
    expect(result.trace).not.toContain('ALLOWED');
  });

  it('E2E-004: a removed Role is denied', async () => {
    const p = createPlatform();
    const result = await p.run({
      afterGrant: () => p.roles.roles.set('teacher', teacher('REMOVED')),
    });
    expect(result.outcome).toBe('SC-004');
    expect(result.trace).not.toContain('ALLOWED');
  });

  it('E2E-005: a non-existent Permission is denied', async () => {
    const p = createPlatform();
    p.permissions.associations.length = 0;
    const result = await p.run();
    expect(result.outcome).toBe('SC-004');
    expect(result.trace).not.toContain('ALLOWED');
  });

  it('E2E-006: a School removed after the context was resolved fails ValidateSchoolContext', async () => {
    const p = createPlatform();
    const result = await p.run({ afterContext: () => p.schools.enabled.delete(SCHOOL) });
    expect(result.outcome).toBe('SC-003');
    expect(result.trace).toContain('ALLOWED');
    expect(result.trace).not.toContain('VALID');
  });

  it('E2E-007: a User removed after the context was resolved fails ValidateSchoolContext', async () => {
    const p = createPlatform();
    const result = await p.run({ afterContext: () => p.users.byId.delete('user-1') });
    expect(result.outcome).toBe('SC-001');
    expect(result.trace).toContain('ALLOWED');
    expect(result.trace).not.toContain('VALID');
  });

  describe('E2E-008: unavailable dependency fails closed', () => {
    it.each([
      ['Users', 'AUTH-004', (p: Platform) => (p.users.failing = true)],
      ['SessionRepository', 'AUTH-004', (p: Platform) => (p.sessions.failing = true)],
      ['PasswordVerifier', 'AUTH-004', (p: Platform) => (p.verifier.failing = true)],
      ['SchoolDirectory', 'MEM-003', (p: Platform) => (p.schools.failing = true)],
      ['ActorAuthorizer', 'MEM-005', (p: Platform) => (p.admins.failing = true)],
    ])('%s down → %s, never AUTHORIZED', async (_name, code, breakIt) => {
      const p = createPlatform();
      breakIt(p);
      const result = await p.run();
      expect(result.outcome).toBe(code);
      expect(result.trace).not.toContain('VALID');
    });

    it.each([
      ['SchoolMembershipRepository', 'memberships'],
      ['GrantRepository', 'grants'],
      ['RoleRepository', 'roles'],
      ['PermissionRepository', 'permissions'],
    ] as const)('%s down is denied and never AUTHORIZED', async (_name, key) => {
      const p = createPlatform();
      p[key].failing = true;
      const result = await p.run();
      expect(result.outcome).not.toBe('AUTHORIZED');
      expect(result.trace).not.toContain('VALID');
    });

    it('PermissionRepository failing after the Grant is persisted yields SC-005', async () => {
      const p = createPlatform();
      const result = await p.run({ afterGrant: () => (p.permissions.failing = true) });
      expect(result.outcome).toBe('SC-005');
    });
  });
});

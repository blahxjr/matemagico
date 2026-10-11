import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { GetSessionService, ProvisionPasswordCredentialService } from '@matemagico/auth';
import type {
  ResolvePermissionsService,
  ResolveSchoolContextService,
} from '@matemagico/membership';
import type { CreateSchoolService, SchoolView } from '@matemagico/schools';
import type {
  CreateUserService,
  DeactivateUserService,
  GetUserService,
  UserView,
} from '@matemagico/users';

export const SCHOOL_ADMIN_ROLE_ID = 'SCHOOL_ADMIN';
/** Roles the founder of a School may hand out, when they exist in the catalogue. */
const FOUNDER_ALLOWLIST_ROLE_IDS = ['STUDENT', 'TEACHER'] as const;

export interface SessionActor {
  readonly userId: string;
  readonly sessionId: string;
  readonly email: string;
  readonly name: string;
  /** Present only when a School and action were requested and the actor is allowed. */
  readonly school?: {
    readonly schoolId: string;
    readonly membershipId: string;
    readonly permissions: readonly string[];
  };
}

/** The only place where an Actor is created: from a Session validated by Auth, never from the client. */
export class GetSessionActorService {
  constructor(
    private readonly deps: {
      getSession: Pick<GetSessionService, 'execute'>;
      users: Pick<GetUserService, 'execute'>;
      schoolContext: Pick<ResolveSchoolContextService, 'execute'>;
      permissions: Pick<ResolvePermissionsService, 'execute'>;
    },
  ) {}

  async execute(input: {
    sessionId: string;
    school?: { schoolId: string; action: string };
  }): Promise<SessionActor> {
    const session = await this.deps.getSession.execute({ sessionId: input.sessionId });
    const user = await this.deps.users.execute({ userId: session.userId });
    const actor = {
      userId: session.userId,
      sessionId: session.sessionId,
      email: user.email,
      name: user.name,
    };
    if (!input.school) return actor;

    const context = await this.deps.schoolContext.execute({
      actor: { userId: actor.userId },
      schoolId: input.school.schoolId,
    });
    const resolved = await this.deps.permissions.execute({
      actor: { userId: actor.userId },
      context,
      action: input.school.action,
    });
    return {
      ...actor,
      school: {
        schoolId: resolved.schoolId,
        membershipId: resolved.membershipId,
        permissions: resolved.permissions,
      },
    };
  }
}

/** Public registration: creates the User and its Argon2id credential; rolls the User back on failure. */
export class RegisterUserService {
  constructor(
    private readonly deps: {
      createUser: Pick<CreateUserService, 'execute'>;
      deactivateUser: Pick<DeactivateUserService, 'execute'>;
      provision: Pick<ProvisionPasswordCredentialService, 'execute'>;
    },
  ) {}

  async execute(input: { email: string; name: string; password: string }): Promise<UserView> {
    const user = await this.deps.createUser.execute({ email: input.email, name: input.name });
    try {
      await this.deps.provision.execute({
        userId: user.userId,
        subject: user.email,
        password: input.password,
      });
    } catch (error) {
      await this.deps.deactivateUser.execute({ userId: user.userId }).catch(() => undefined);
      throw error;
    }
    return user;
  }
}

export interface ProfileSchool {
  readonly schoolId: string;
  readonly name: string;
  readonly slug: string;
  readonly membershipId: string;
  readonly roles: readonly string[];
}

export interface Profile {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly roles: readonly string[];
  readonly schools: readonly ProfileSchool[];
}

/** Read model for GET /auth/me: ACTIVE Memberships of ACTIVE Schools and their effective Roles. */
export class GetProfileService {
  constructor(
    private readonly deps: {
      prisma: PrismaClient;
      users: Pick<GetUserService, 'execute'>;
      clock: { now(): Date };
    },
  ) {}

  async execute(input: { userId: string }): Promise<Profile> {
    const { prisma } = this.deps;
    const now = this.deps.clock.now();
    const user = await this.deps.users.execute({ userId: input.userId });

    const memberships = await prisma.schoolMembership.findMany({
      where: { userId: input.userId, state: 'ACTIVE' },
    });
    const schools = await prisma.school.findMany({
      where: { schoolId: { in: memberships.map((m) => m.schoolId) }, status: 'ACTIVE' },
    });
    const grants = await prisma.grant.findMany({
      where: {
        membershipId: { in: memberships.map((m) => m.membershipId) },
        revokedAt: null,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      include: { role: true },
    });

    const all = new Set<string>();
    const result: ProfileSchool[] = [];
    for (const school of schools) {
      const membership = memberships.find((m) => m.schoolId === school.schoolId)!;
      const roles = [
        ...new Set(
          grants
            .filter(
              (g) => g.membershipId === membership.membershipId && g.role.status === 'APPROVED',
            )
            .map((g) => g.role.code),
        ),
      ].sort();
      roles.forEach((role) => all.add(role));
      result.push({
        schoolId: school.schoolId,
        name: school.name,
        slug: school.slug,
        membershipId: membership.membershipId,
        roles,
      });
    }
    return {
      userId: user.userId,
      email: user.email,
      name: user.name,
      roles: [...all].sort(),
      schools: result,
    };
  }
}

/**
 * Creates a School for an authenticated User and makes that User its first SCHOOL_ADMIN
 * (ACTIVE Membership + Grant + allowlist), so nobody else is needed to administer it.
 */
export class FoundSchoolService {
  constructor(
    private readonly deps: {
      prisma: PrismaClient;
      createSchool: Pick<CreateSchoolService, 'execute'>;
      deactivate(schoolId: string): Promise<void>;
      clock: { now(): Date };
    },
  ) {}

  async execute(input: { founderUserId: string; name: string; slug: string }): Promise<SchoolView> {
    const school = await this.deps.createSchool.execute({ name: input.name, slug: input.slug });
    try {
      await this.enroll(input.founderUserId, school.schoolId);
    } catch (error) {
      await this.deps.deactivate(school.schoolId).catch(() => undefined);
      throw error;
    }
    return school;
  }

  private async enroll(userId: string, schoolId: string): Promise<void> {
    const now = this.deps.clock.now();
    await this.deps.prisma.$transaction(async (tx) => {
      const admin = await tx.role.findUnique({ where: { roleId: SCHOOL_ADMIN_ROLE_ID } });
      if (!admin || admin.status !== 'APPROVED') throw new Error('SCHOOL_ADMIN role is not seeded');
      const membershipId = randomUUID();
      await tx.schoolMembership.create({
        data: { membershipId, userId, schoolId, state: 'ACTIVE', createdAt: now, activatedAt: now },
      });
      await tx.grant.create({
        data: {
          grantId: randomUUID(),
          membershipId,
          roleId: admin.roleId,
          schoolId,
          grantedBy: userId,
          validFrom: now,
        },
      });
      const roles = await tx.role.findMany({
        where: { roleId: { in: [...FOUNDER_ALLOWLIST_ROLE_IDS] }, status: 'APPROVED' },
      });
      for (const role of roles) {
        await tx.roleGrantAllowlist.create({
          data: { actorUserId: userId, schoolId, roleId: role.roleId },
        });
      }
    });
  }
}

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { createCompositionRoot } from '@matemagico/composition-root';

const prisma = new PrismaClient();

const PERMISSIONS = {
  STUDENT: ['school:read'],
  TEACHER: [
    'school:read',
    'question:create',
    'question:update',
    'question:publish',
    'exam:create',
    'exam:publish',
  ],
  SCHOOL_ADMIN: [
    'membership:create',
    'membership:activate',
    'role:grant',
    'school:read',
    'school:update',
    'question:create',
    'question:update',
    'question:publish',
    'exam:create',
    'exam:publish',
  ],
} as const;

const ROLES = [
  { code: 'STUDENT', privileged: false },
  { code: 'TEACHER', privileged: false },
  { code: 'SCHOOL_ADMIN', privileged: true },
] as const;

async function seedRolesAndPermissions(): Promise<void> {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { roleId: role.code },
      update: { code: role.code, scope: 'SCHOOL', status: 'APPROVED', privileged: role.privileged },
      create: {
        roleId: role.code,
        code: role.code,
        scope: 'SCHOOL',
        status: 'APPROVED',
        privileged: role.privileged,
      },
    });
    for (const permissionCode of PERMISSIONS[role.code]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionCode: { roleId: role.code, permissionCode } },
        update: {},
        create: { roleId: role.code, permissionCode },
      });
    }
  }
  console.log(`Roles seeded: ${ROLES.map((role) => role.code).join(', ')}.`);
}

/** Optional local bootstrap (SEED_DEMO=true): a School with its first SCHOOL_ADMIN. */
async function seedDemoSchool(): Promise<void> {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('SEED_DEMO=true requires SEED_ADMIN_PASSWORD (at least 12 characters).');
  }
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@matemagico.local';
  const { services } = createCompositionRoot(prisma);

  const school = await services.findSchoolBySlug
    .execute({ slug: 'escola-demo' })
    .catch(() => services.createSchool.execute({ name: 'Escola Demo', slug: 'escola-demo' }));

  let admin = await services.findUserByEmail.execute({ email }).catch(() => null);
  if (!admin) {
    admin = await services.createUser.execute({ email, name: 'Administrador Demo' });
    await services.provisionPasswordCredential.execute({
      userId: admin.userId,
      subject: admin.email,
      password,
    });
  }

  const now = new Date();
  const existing = await prisma.schoolMembership.findFirst({
    where: { userId: admin.userId, schoolId: school.schoolId, state: 'ACTIVE' },
  });
  const membership =
    existing ??
    (await prisma.schoolMembership.create({
      data: {
        membershipId: randomUUID(),
        userId: admin.userId,
        schoolId: school.schoolId,
        state: 'ACTIVE',
        createdAt: now,
        activatedAt: now,
      },
    }));

  const hasGrant = await prisma.grant.findFirst({
    where: { membershipId: membership.membershipId, roleId: 'SCHOOL_ADMIN', revokedAt: null },
  });
  if (!hasGrant) {
    await prisma.grant.create({
      data: {
        grantId: randomUUID(),
        membershipId: membership.membershipId,
        roleId: 'SCHOOL_ADMIN',
        schoolId: school.schoolId,
        grantedBy: admin.userId,
        validFrom: now,
      },
    });
  }

  for (const roleId of ['STUDENT', 'TEACHER'] as const) {
    await prisma.roleGrantAllowlist.upsert({
      where: {
        actorUserId_schoolId_roleId: {
          actorUserId: admin.userId,
          schoolId: school.schoolId,
          roleId,
        },
      },
      update: {},
      create: { actorUserId: admin.userId, schoolId: school.schoolId, roleId },
    });
  }
  console.log(`Demo school "${school.slug}" ready with SCHOOL_ADMIN ${admin.email}.`);
}

async function seedQuestionBank(): Promise<void> {
  const { services, repositories } = createCompositionRoot(prisma);
  const data = JSON.parse(readFileSync('data/questions/mock-questions.json', 'utf8')) as {
    topics: { slug: string; name: string; description: string }[];
    questions: unknown[];
  };
  for (const topic of data.topics) {
    if (!(await repositories.topics.findBySlug(topic.slug))) {
      await services.createTopic.execute(topic);
    }
  }
  const report = await services.importQuestions.execute({
    format: 'json',
    payload: JSON.stringify(data.questions),
    publish: true,
  });
  if (report.failed.length > 0) {
    throw new Error(`Question import failed: ${JSON.stringify(report.failed)}`);
  }
  const published = await prisma.question.count({
    where: { status: 'PUBLISHED', sourceName: 'MOCK' },
  });
  console.log(
    `Question bank seeded (MOCK content): created ${report.created}, skipped ${report.skipped}, published ${published}.`,
  );
}

async function main(): Promise<void> {
  await seedRolesAndPermissions();
  await seedQuestionBank();
  if (process.env.SEED_DEMO === 'true') await seedDemoSchool();
  console.log('Seed completed.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

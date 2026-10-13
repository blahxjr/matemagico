import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';

const API = 'http://localhost:3333';
const PASSWORD = 'senha-segura-123';
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/matemagico_test';

async function call(path: string, body: unknown, token?: string) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} -> ${response.status} ${text}`);
  return JSON.parse(text) as Record<string, string>;
}

async function ensureRoles() {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const content = [
    'question:create',
    'question:update',
    'question:publish',
    'exam:create',
    'exam:publish',
  ];
  const roles: [string, boolean, string[]][] = [
    ['STUDENT', false, ['school:read']],
    ['TEACHER', false, ['school:read', ...content]],
    [
      'SCHOOL_ADMIN',
      true,
      [
        'membership:create',
        'membership:activate',
        'role:grant',
        'school:read',
        'school:update',
        ...content,
      ],
    ],
  ];
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
  await prisma.$disconnect();
}

async function register(label: string) {
  const email = `${label.toLowerCase().replace(/\s+/g, '-')}-${randomUUID().slice(0, 8)}@escola.test`;
  const { userId } = await call('/auth/register', { email, name: label, password: PASSWORD });
  return { email, userId: userId as string };
}

async function signUp(label: string) {
  const user = await register(label);
  const { email, userId } = user;
  const login = await call('/auth/login', { email, password: PASSWORD });
  return { email, userId, token: login.sessionId as string };
}

async function seed() {
  await ensureRoles();
  const admin = await signUp('admin');
  const teacher = await signUp('teacher');
  const student = await register('Aluno Jornada');
  const intruder = await register('intruso');
  const { schoolId } = await call(
    '/schools',
    { name: 'Escola', slug: `escola-${randomUUID().slice(0, 8)}` },
    admin.token,
  );
  const enroll = async (user: { userId: string }, roleId: string) => {
    const { membershipId } = await call(
      '/memberships',
      { userId: user.userId, schoolId },
      admin.token,
    );
    await call(`/memberships/${membershipId}/activate`, {}, admin.token);
    await call(`/memberships/${membershipId}/grants`, { roleId }, admin.token);
  };
  await enroll(teacher, 'TEACHER');
  await enroll(student, 'STUDENT');
  await enroll(intruder, 'STUDENT');

  const { topicId } = await call(
    '/topics',
    { schoolId, name: 'Aritmética', slug: `t-${randomUUID().slice(0, 8)}` },
    teacher.token,
  );
  for (const [i, extra] of [
    { difficulty: 'EASY' },
    { difficulty: 'HARD', imageUrl: 'http://localhost:9/missing.png', imageStatus: 'VALID' },
  ].entries()) {
    const { questionId } = await call(
      '/questions',
      {
        schoolId,
        title: `Questão ${i + 1}`,
        statement: `Quanto é ${i + 2} + ${i + 2}?`,
        level: 'OBMEP_N1',
        topicId,
        sourceName: 'MOCK',
        sourceReference: randomUUID(),
        sourceType: 'INTERNAL',
        authorName: 'MateMágico',
        explanation: 'Some os dois números.',
        options: [
          { label: 'A', content: 'Errada', isCorrect: false },
          { label: 'B', content: 'Correta', isCorrect: true },
        ],
        ...extra,
      },
      teacher.token,
    );
    for (const action of ['review', 'approve', 'publish']) {
      await call(`/questions/${questionId}/${action}`, { schoolId }, teacher.token);
    }
  }
  const { examId } = await call(
    '/exams',
    {
      schoolId,
      title: 'Simulado Jornada',
      level: 'OBMEP_N1',
      topicId,
      quantity: 2,
      seed: randomUUID(),
      durationMinutes: 30,
    },
    teacher.token,
  );
  await call(`/exams/${examId}/publish`, { schoolId }, teacher.token);
  return { student, intruder, schoolId, examId };
}

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

test.describe.configure({ mode: 'serial' });

test('student journey: list → answer → finish → result → history', async ({ page, browser }) => {
  const { student, intruder } = await seed();
  await login(page, student.email);

  await page.goto('/app/exams');
  await expect(page.getByText('Simulado Jornada')).toBeVisible();
  await page
    .getByRole('link', { name: /Iniciar/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Iniciar simulado' }).click();

  await expect(page.getByRole('timer')).toBeVisible();
  const saved = page.waitForResponse(
    (r) => r.url().includes('/answers') && r.request().method() === 'POST' && r.ok(),
  );
  await page.getByRole('radio', { name: /Correta/ }).check();
  await saved;

  // The answer survives a refresh.
  await page.reload();
  await expect(page.getByRole('radio', { name: /Correta/ })).toBeChecked();

  await page.getByRole('button', { name: 'Próxima' }).click();
  await page.getByRole('radio', { name: /Errada/ }).check();
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar e finalizar' }).click();

  await expect(page).toHaveURL(/\/app\/attempts\//);
  await expect(page.getByTestId('score')).toContainText('50');
  await expect(page.getByText('Some os dois números.').first()).toBeVisible();
  await expect(page.getByTestId('image-placeholder')).toBeVisible();
  const attemptUrl = page.url();

  await page.goto('/app/history');
  await expect(page.getByText('Simulado Jornada')).toBeVisible();
  await expect(page.getByRole('link', { name: /Ver resultado/ })).toBeVisible();

  // Another student must not read this attempt.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await login(otherPage, intruder.email);
  await otherPage.goto(attemptUrl);
  await expect(otherPage.getByTestId('forbidden')).toBeVisible();
  await other.close();
});

test('exam pages fit a 320px viewport', async ({ page }) => {
  const { student } = await seed();
  await login(page, student.email);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/app/exams');
  await expect(page.getByText('Simulado Jornada')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

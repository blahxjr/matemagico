import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const API = 'http://localhost:3333';
const PASSWORD = 'senha-segura-123';
const databaseUrl = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;

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

async function get<T>(path: string, token: string) {
  const response = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`${path} -> ${response.status}`);
  return (await response.json()) as T;
}

async function ensureRoles() {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const content = [
    'question:create',
    'question:update',
    'question:publish',
    'exam:create',
    'exam:publish',
    'report:read',
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
        'membership:read',
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

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

test.describe.configure({ mode: 'serial' });

test('admin and teacher journey: activate → grant → create/publish exam → ranking → performance', async ({
  page,
  browser,
}) => {
  await ensureRoles();
  const admin = await signUp('admin');
  const teacher = await signUp('teacher');
  const student = await signUp('Aluno Ranking');
  const pending = await register('Pendente Silva');
  const { schoolId } = await call(
    '/schools',
    { name: 'Escola', slug: `escola-${randomUUID().slice(0, 8)}` },
    admin.token,
  );
  const enroll = async (user: { userId: string }, roleId?: string) => {
    const { membershipId } = await call(
      '/memberships',
      { userId: user.userId, schoolId },
      admin.token,
    );
    if (!roleId) return;
    await call(`/memberships/${membershipId}/activate`, {}, admin.token);
    await call(`/memberships/${membershipId}/grants`, { roleId }, admin.token);
  };
  await enroll(teacher, 'TEACHER');
  await enroll(student, 'STUDENT');
  await enroll(pending);

  const topicName = `Aritmética ${randomUUID().slice(0, 8)}`;
  const { topicId } = await call(
    '/topics',
    { schoolId, name: topicName, slug: `t-${randomUUID().slice(0, 8)}` },
    teacher.token,
  );
  for (const i of [0, 1]) {
    const { questionId } = await call(
      '/questions',
      {
        schoolId,
        title: `Questão ${i + 1}`,
        statement: `Quanto é ${i + 2} + ${i + 2}?`,
        level: 'OBMEP_N1',
        topicId,
        difficulty: 'EASY',
        sourceName: 'MOCK',
        sourceReference: randomUUID(),
        sourceType: 'INTERNAL',
        authorName: 'MateMágico',
        explanation: 'Some os dois números.',
        options: [
          { label: 'A', content: 'Errada', isCorrect: false },
          { label: 'B', content: 'Correta', isCorrect: true },
        ],
      },
      teacher.token,
    );
    for (const action of ['review', 'approve', 'publish']) {
      await call(`/questions/${questionId}/${action}`, { schoolId }, teacher.token);
    }
  }

  // Scenarios 1 and 2: admin activates the pending member, then grants TEACHER.
  await login(page, admin.email);
  await page.goto('/app/admin/students');
  await page.getByRole('button', { name: 'Ativar Pendente Silva' }).click();
  await expect(page.getByRole('button', { name: 'Conceder papel a Pendente Silva' })).toBeVisible();
  await page.getByLabel('Papel para Pendente Silva').selectOption('TEACHER');
  await page.getByRole('button', { name: 'Conceder papel a Pendente Silva' }).click();
  await expect(page.getByRole('row', { name: /Pendente Silva/ })).toContainText('Professor');

  // Scenarios 3 and 4: teacher creates a draft and publishes it.
  const teacherContext = await browser.newContext();
  const teacherPage = await teacherContext.newPage();
  await login(teacherPage, teacher.email);
  await teacherPage.goto('/app/admin/exams');
  await teacherPage.getByLabel('Tema').selectOption({ label: topicName });
  await teacherPage.getByLabel('Título').fill('Simulado Admin');
  await teacherPage.getByLabel('Quantidade de questões').fill('2');
  await teacherPage.getByRole('button', { name: 'Criar simulado' }).click();
  await expect(teacherPage.getByRole('row', { name: /Simulado Admin/ })).toContainText('Rascunho');
  await teacherPage.getByRole('button', { name: 'Editar Simulado Admin' }).click();
  await teacherPage.getByLabel('Título do simulado Simulado Admin').fill('Simulado Revisado');
  await teacherPage.getByRole('button', { name: 'Salvar alterações de Simulado Admin' }).click();
  await expect(teacherPage.getByRole('row', { name: /Simulado Revisado/ })).toContainText(
    'Rascunho',
  );
  await teacherPage.getByRole('button', { name: 'Publicar Simulado Revisado' }).click();
  await expect(teacherPage.getByRole('row', { name: /Simulado Revisado/ })).toContainText(
    'Publicado',
  );

  // Scenario 5: student completes the exam (API), which emits AttemptCompleted.
  const { items } = await get<{ items: { examId: string; title: string }[] }>(
    `/exams?schoolId=${schoolId}`,
    student.token,
  );
  const examId = items.find((item) => item.title === 'Simulado Revisado')!.examId;
  const attempt = (await call(
    `/exams/${examId}/attempts`,
    { schoolId },
    student.token,
  )) as unknown as {
    attemptId: string;
    questions: { questionId: string }[];
  };
  for (const question of attempt.questions) {
    await call(
      `/attempts/${attempt.attemptId}/answers`,
      { schoolId, questionId: question.questionId, selectedOption: 'B' },
      student.token,
    );
  }
  await call(`/attempts/${attempt.attemptId}/finish`, { schoolId }, student.token);

  // Scenarios 6 and 7: the ranking reflects the event; admin sees the school ranking.
  await page.goto('/app/admin/rankings');
  await expect(page.getByRole('row', { name: /Aluno Ranking/ })).toContainText('100');

  // Scenario 8: teacher sees the exam ranking.
  await teacherPage.goto(`/app/admin/rankings?examId=${examId}`);
  await expect(teacherPage.getByRole('table', { name: /Ranking do simulado/ })).toBeVisible();
  await expect(teacherPage.getByRole('row')).not.toHaveCount(1);

  // Scenario 9: admin sees performance per student and per topic.
  await page.goto('/app/admin/performance');
  await expect(page.getByText('Aluno Ranking')).toBeVisible();
  await expect(page.getByText(topicName)).toBeVisible();
  await teacherPage.goto('/app/admin/performance');
  await expect(teacherPage.getByRole('table', { name: 'Desempenho por aluno' })).toBeVisible();
  await expect(
    teacherPage.getByRole('row', { name: new RegExp(`Aluno ${student.userId.slice(0, 8)}`) }),
  ).toContainText('100');

  // Students cannot reach the admin area.
  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await login(studentPage, student.email);
  await studentPage.goto('/app/admin/rankings');
  await expect(studentPage).toHaveURL(/\/app\/dashboard/);
  await teacherContext.close();
  await studentContext.close();
});

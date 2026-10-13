import { expect, test } from '@playwright/test';

test('register → login → dashboard → logout', async ({ page, context }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'senha-segura-123';

  await page.goto('/app/dashboard');
  await expect(page).toHaveURL(/\/login/);

  await page.getByRole('link', { name: 'Criar conta' }).click();
  await page.getByLabel('Nome').fill('Aluna E2E');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/login\?registered=1/);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/app\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Olá, Aluna E2E' })).toBeVisible();
  await expect(page.getByText('Aluno', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editorial' })).toHaveCount(0);

  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === 'mm_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Lax');
  if (process.env.NODE_ENV === 'production') expect(session?.secure).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain('mm_session');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('mm_session');

  const logoutResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/logout') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  expect((await logoutResponse).ok()).toBe(true);
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/app/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('invalid credentials show an error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('nobody@example.com');
  await page.getByLabel('Senha').fill('senha-errada-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});

test('layout is usable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/login');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

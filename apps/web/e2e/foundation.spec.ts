import { expect, test } from '@playwright/test';

test('MVP login entry point loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MateMágico Champions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await expect(page.getByLabel('E-mail')).toBeVisible();
});

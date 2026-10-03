import { expect, test } from '@playwright/test';

test('foundation home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MateMágico Champions' })).toBeVisible();
  await expect(page.getByText('TypeScript strict')).toBeVisible();
});

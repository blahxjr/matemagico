import { defineConfig, devices } from '@playwright/test';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/matemagico_test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run start --workspace @matemagico/api',
      url: 'http://localhost:3333/health',
      reuseExistingServer: true,
      timeout: 60_000,
      env: { DATABASE_URL: databaseUrl, PORT: '3333' },
    },
    {
      command: 'npm run dev --workspace @matemagico/web',
      url: 'http://localhost:3000/login',
      reuseExistingServer: true,
      timeout: 120_000,
      env: { API_URL: 'http://localhost:3333' },
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

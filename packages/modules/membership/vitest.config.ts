import { defineConfig } from 'vitest/config';

// Database-backed suites share one TEST_DATABASE_URL, so test files must not run concurrently.
export default defineConfig({
  test: { fileParallelism: false },
});

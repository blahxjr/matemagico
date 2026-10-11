import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !testDatabaseUrl) {
  console.error('test:db requires both DATABASE_URL and TEST_DATABASE_URL.');
  process.exit(1);
}

if (databaseUrl !== testDatabaseUrl) {
  console.error('test:db requires DATABASE_URL and TEST_DATABASE_URL to target the same database.');
  process.exit(1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const workspaces = [
  '@matemagico/auth',
  '@matemagico/users',
  '@matemagico/schools',
  '@matemagico/topics',
  '@matemagico/questions',
  '@matemagico/mock-exams',
  '@matemagico/membership',
  '@matemagico/composition-root',
  '@matemagico/api',
];

for (const workspace of workspaces) {
  console.log(`Running database tests for ${workspace}`);
  const result = spawnSync(npm, ['run', 'test:db', '--workspace', workspace], {
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(`Unable to start database tests for ${workspace}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

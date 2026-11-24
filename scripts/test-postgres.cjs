const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

if (!process.env.TEST_DATABASE_URL) {
  console.error('Set TEST_DATABASE_URL to a dedicated, migrated PostgreSQL test database');
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), '--runInBand', 'tests/catalog.postgres.test.ts'], {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) console.error('Unable to launch PostgreSQL integration tests');
  process.exitCode = result.status ?? 1;
}

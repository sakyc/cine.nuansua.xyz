const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...process.argv.slice(2)], {
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
});
if (result.error) console.error('Unable to launch Prisma CLI');
process.exitCode = result.status ?? 1;

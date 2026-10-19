import { spawnSync } from 'node:child_process';
import { env, execPath } from 'node:process';

const result = spawnSync(execPath, ['--test', 'test/database.integration.test.js'], {
  env: { ...env, RUN_DB_TESTS: '1' },
  stdio: 'inherit',
});
process.exit(result.status ?? 1);

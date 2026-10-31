import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// Uses the local test server only; never loads the application's production DATABASE_URL.
const password = (await readFile(resolve('.local/mariadb/root.private'), 'utf8')).trim();
const url = `mysql://root:${encodeURIComponent(password)}@127.0.0.1:53307/unused_excel_tests`;
const child = spawn(process.execPath, [resolve('node_modules/vitest/vitest.mjs'), 'run', '--no-file-parallelism', 'tests/product-updates.integration.test.ts', 'tests/excel.unit.test.ts', 'tests/product-updates.unit.test.ts'], {
  cwd: resolve('server'), windowsHide: true, stdio: 'inherit', env: { ...process.env, TEST_DATABASE_URL: url },
});
child.on('exit', code => { process.exitCode = code ?? 1; });

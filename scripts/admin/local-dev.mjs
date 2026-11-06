import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';

if (process.platform !== 'win32') throw new Error('This launcher uses locally installed PostgreSQL on Windows.');
const root = fileURLToPath(new URL('../../', import.meta.url));
const databaseScript = path.join(root, 'scripts/admin/local-postgres.ps1');
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Setup failed: ${path.basename(command)}`);
}
for (const port of [3001, 5174]) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${port} is already occupied. Stop the other development server first.`)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}
run(process.execPath, [path.join(root, 'scripts/admin/init-env.mjs')]);
run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', databaseScript]);
for (const args of [['generate'], ['migrate', 'deploy']]) {
  run(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), ...args], path.join(root, 'server'));
}
run(process.execPath, [path.join(root, 'scripts/admin/copy-fonts.mjs')]);
const children = [
  spawn(process.execPath, [path.join(root, 'node_modules/tsx/dist/cli.mjs'), 'watch', 'src/index.ts'], {
    cwd: path.join(root, 'server'), stdio: 'inherit', windowsHide: true,
    env: { ...process.env, HOST: '127.0.0.1', PORT: '3001' },
  }),
  spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5174'], {
    cwd: path.join(root, 'admin'), stdio: 'inherit', windowsHide: true,
    env: { ...process.env, ADMIN_API_PROXY: 'http://127.0.0.1:3001' },
  }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.pid && child.exitCode === null) spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  }
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', databaseScript, '-Action', 'Stop'], { cwd: root, stdio: 'inherit', windowsHide: true });
  process.exit(result.status === 0 ? code : 1);
}
for (const child of children) {
  child.once('error', error => { console.error(error.message); stop(1); });
  child.once('exit', code => stop(code ?? 1));
}
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
console.log('Admin: http://localhost:5174/admin/ — create the real owner in another terminal with npm run seed:owner. Ctrl+C stops the applications; npm run db:local:stop safely stops any remaining database process.');

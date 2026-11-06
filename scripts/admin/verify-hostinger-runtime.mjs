import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ? resolve(process.argv[2]) : resolve(dirname(fileURLToPath(import.meta.url)), '../..');
for (const file of [
  'server.js',
  'server/dist/index.js',
  'packages/shared/dist/index.js',
  'dist/index.html',
  'admin/dist/index.html',
]) {
  if (!existsSync(join(root, file))) throw new Error(`Hostinger runtime file missing: ${file}`);
}
for (const directory of ['dist/assets', 'admin/dist/assets']) {
  if (!existsSync(join(root, directory)) || readdirSync(join(root, directory)).length === 0) {
    throw new Error(`Hostinger frontend assets missing: ${directory}`);
  }
}
if (existsSync(join(root, 'dist/api'))) throw new Error('Static API files must not be deployed.');
console.log('Hostinger runtime files verified.');

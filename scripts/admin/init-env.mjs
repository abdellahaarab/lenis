import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const password = randomBytes(32).toString('hex');
let contents = await readFile(new URL('.env.example', root), 'utf8');
contents = contents.replace(/^MYSQL_PASSWORD=$/m, `MYSQL_PASSWORD=${password}`)
  .replace(/^MYSQL_ROOT_PASSWORD=$/m, `MYSQL_ROOT_PASSWORD=${randomBytes(32).toString('hex')}`)
  .replace(/^DATABASE_URL=$/m, `DATABASE_URL=mysql://alarbi:${password}@127.0.0.1:3306/alarbi`)
  .replace(/^SESSION_SECRET=$/m, `SESSION_SECRET=${randomBytes(48).toString('hex')}`)
  .replace(/^TOTP_ENCRYPTION_KEY=$/m, `TOTP_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`);
try {
  await writeFile(new URL('.env', root), contents, { flag: 'wx', mode: 0o600 });
  console.log('Created .env with random local infrastructure secrets. No staff account was created.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('.env already exists; preserved without changes.');
  else throw error;
}

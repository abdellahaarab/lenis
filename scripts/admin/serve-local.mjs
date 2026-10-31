import {existsSync} from 'node:fs';
import {config} from 'dotenv';
import {ensureLocalDatabase} from './ensure-local-database.mjs';
if(!existsSync('server/dist/index.js')||!existsSync('dist/index.html')||!existsSync('admin/dist/index.html'))throw new Error('Run npm run build:all first.');
config({path:'.env',quiet:true});
const database=new URL(process.env.DATABASE_URL??'');
if(!['127.0.0.1','localhost','::1'].includes(database.hostname))throw new Error('Local development requires a loopback database. Keep Hostinger credentials in .env.hostinger; never develop against production.');
await ensureLocalDatabase(database.toString());
// Loopback preview uses the existing local database and stable keys from .env.
// Production settings remain enforced by the normal npm start command.
Object.assign(process.env,{NODE_ENV:'development',HOST:'127.0.0.1',PORT:'53000',COOKIE_SECURE:'false',TRUST_PROXY:'false',SERVE_STATIC:'true',ALLOWED_ORIGINS:'http://127.0.0.1:53000,http://localhost:53000'});
await import('../../server/dist/index.js');

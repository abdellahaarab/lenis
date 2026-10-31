import {config,parse} from 'dotenv';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
config({path:'.env.hostinger',override:true,quiet:true});
const local=parse(await readFile('.env','utf8'));
for(const key of ['SESSION_SECRET','TOTP_ENCRYPTION_KEY']) process.env[key]=local[key];
process.env.ALLOWED_ORIGINS='https://alarabiye.com';
process.env.COOKIE_SECURE='true';process.env.NODE_ENV='production';
const command=process.argv.slice(2);
if(!command.length) throw new Error('Usage: node scripts/admin/hostinger-db.mjs <npm script> [arguments]');
if(!['db:commerce:repair-case','db:commerce:seed','db:migrate','db:migrate:repair','db:legacy:import','db:import','db:backup','db:audit:protect','db:verify'].includes(command[0])) throw new Error('Unsupported database task');
// Child argv is not assembled into a shell string; npm-cli receives exact arguments.
const npmCli=process.env.npm_execpath ?? 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js';
const result=spawnSync(process.execPath,[npmCli,'run',command[0],...(command.length>1?['--',...command.slice(1)]:[])],{env:process.env,stdio:'inherit',windowsHide:true});
process.exitCode=result.status??1;
if(result.status===0){
  const remote=parse(await readFile('.env.hostinger','utf8'));
  const runtime={...local,...remote,NODE_ENV:'production',HOST:'0.0.0.0',PORT:'3000',ALLOWED_ORIGINS:'https://alarabiye.com',COOKIE_SECURE:'true',TRUST_PROXY:'true'};
  const serialized=Object.entries(runtime).filter(([key])=>!key.startsWith('POSTGRES')).map(([key,value])=>key+'='+JSON.stringify(value)).join('\n')+'\n';
  await writeFile('.env.hostinger',serialized,{mode:0o600});
}

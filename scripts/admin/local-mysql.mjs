import {spawn,spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomBytes} from 'node:crypto';
import mariadb from 'mariadb';
const bin=process.env.MYSQL_BIN??'C:/laragon/bin/mysql/mariadb-10.4.32-winx64/bin';
const dir=resolve(process.env.LOCAL_MYSQL_DIR??'.local/mariadb');
const port=Number(process.env.LOCAL_MYSQL_PORT??53307);
await mkdir(dir,{recursive:true});
const secretPath=join(dir,'root.private');let secret;
try{secret=await readFile(secretPath,'utf8');}catch{
  secret=randomBytes(32).toString('hex');
  const init=spawnSync(join(bin,'mysql_install_db.exe'),['--datadir='+dir,'--password='+secret],{windowsHide:true,stdio:'pipe'});
  if(init.status!==0) throw new Error('Database initialization failed; no existing database was modified');
  await writeFile(secretPath,secret,{mode:0o600,flag:'wx'});
}
const server=spawn(join(bin,'mysqld.exe'),['--no-defaults','--datadir='+dir,'--port='+port,'--bind-address=127.0.0.1','--default-time-zone=+00:00','--console'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
server.stderr.on('data',chunk=>{if(chunk.toString().includes('[ERROR]')) process.stderr.write(chunk);});
let c;
for(let i=0;i<60;i++){try{c=await mariadb.createConnection({host:'127.0.0.1',port,user:'root',password:secret});break;}catch{await new Promise(r=>setTimeout(r,500));}}
if(!c) {server.kill();throw new Error('Database start failed; check port');}
await c.query('CREATE DATABASE IF NOT EXISTS alarbi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');await c.end();
const env=await readFile('.env','utf8');
await writeFile('.env',env.replace(/^DATABASE_URL=.*$/m,`DATABASE_URL=mysql://root:${secret}@127.0.0.1:${port}/alarbi`).replace(/^PORT=.*$/m,'PORT=3000'),{mode:0o600});
console.log('Isolated database at 127.0.0.1:'+port+'; existing session and encryption keys preserved.');
const children=[];
if(!process.argv.includes('--database-only')){
  const npmCli=process.env.npm_execpath??'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js';
  const migrated=spawnSync(process.execPath,[npmCli,'run','db:migrate'],{windowsHide:true,stdio:'inherit'});
  if(migrated.status!==0){server.kill();process.exitCode=1;}
  else for(const script of ['dev:server','dev:admin','dev']) children.push(spawn(process.execPath,[npmCli,'run',script],{windowsHide:true,stdio:'inherit'}));
}
function stop(){for(const child of children) child.kill();server.kill();}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
await new Promise(r=>server.on('exit',r));

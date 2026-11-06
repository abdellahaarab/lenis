import {spawn} from 'node:child_process';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,stat,unlink,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import mariadb from 'mariadb';
import {rootCertificates} from 'node:tls';
import {loadConfig} from './config.js';
const mode=process.argv[2];
const url=new URL(mode==='restore'?(process.env.RESTORE_DATABASE_URL??''):loadConfig().DATABASE_URL);
if(url.protocol!=='mysql:') throw new Error('A MySQL URL is required');
const bin=process.env.MYSQL_CLIENT_BIN??(process.platform==='win32'?'C:/laragon/bin/mysql/mysql-8.0.30-winx64/bin':'');
let sslCa:string|undefined;
if(url.searchParams.get('ssl')==='true'){await mkdir('.local',{recursive:true});sslCa=process.env.MYSQL_SSL_CA??resolve('.local','mysql-ca.pem');if(!process.env.MYSQL_SSL_CA)await writeFile(sslCa,rootCertificates.join('\n')+'\n');}
const common=['--host='+url.hostname,'--port='+(url.port||'3306'),'--user='+decodeURIComponent(url.username),'--default-character-set=utf8mb4',...(url.searchParams.get('ssl')==='true'?['--ssl-mode=VERIFY_IDENTITY','--ssl-ca='+sslCa]:[])];
async function run(executable:string,args:string[],target:string,restore=false){
  const child=spawn(join(bin,executable),args,{env:{...process.env,MYSQL_PWD:decodeURIComponent(url.password)},windowsHide:true,stdio:['pipe','pipe','pipe']});
  if(restore) {createReadStream(target).pipe(child.stdin);child.stdout.resume();}
  else {child.stdin.end();child.stdout.pipe(createWriteStream(target,{flags:'wx',mode:0o600}));}
  let error='';child.stderr.on('data',c=>{error+=c.toString();});
  await new Promise<void>((ok,fail)=>{child.on('error',fail);child.on('close',code=>code===0?ok():fail(new Error('Backup client failed: '+error.replaceAll(decodeURIComponent(url.password),'[redacted]'))));});
}
if(mode==='backup'){
  await mkdir('.backups',{recursive:true});const target=resolve('.backups',url.pathname.slice(1)+'-'+Date.now()+'.sql');
  try{await run(process.platform==='win32'?'mysqldump.exe':'mysqldump',[...common,'--column-statistics=0','--no-tablespaces','--hex-blob','--single-transaction','--set-gtid-purged=OFF','--skip-comments',url.pathname.slice(1)],target);if((await stat(target)).size<100)throw new Error('Empty backup');console.log('Backup: '+target+' (includes images and audit triggers; keep private).');}catch(e){await unlink(target).catch(()=>{});throw e;}
}else if(mode==='restore'){
  const target=process.argv[3];if(!target)throw new Error('Usage: RESTORE_DATABASE_URL=<empty database> npm run db:restore -- <backup.sql>');
  const c=await mariadb.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),...(url.searchParams.get('ssl')==='true'?{ssl:true}:{})});
  try{if((await c.query('SHOW TABLES')).length)throw new Error('Restore refuses a nonempty database. Create a new empty database; never resets existing data.');}finally{await c.end();}
  // Rebind trigger ownership when restoring to a different host/account.
  const portable=resolve('.backups','restore-'+Date.now()+'.sql');await mkdir('.backups',{recursive:true});
  const dump=(await readFile(resolve(target),'utf8')).replace(/\/\*!50017 DEFINER=[^\r\n]*?\*\//g,'');
  await writeFile(portable,dump,{flag:'wx',mode:0o600});
  try{await run(process.platform==='win32'?'mysql.exe':'mysql',[...common,url.pathname.slice(1)],portable,true);console.log('Backup restored into the empty database.');}finally{await unlink(portable);}
}else throw new Error('Use backup or restore');

import {config} from 'dotenv';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import mariadb from 'mariadb';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
config({path:'.env',quiet:true});
const url=new URL(process.env.DATABASE_URL),backup=process.argv[2];
if(!backup||!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Local rehearsal requires a backup path.');
const name='commerce_restore_'+randomUUID().replaceAll('-','');
const sql=await mariadb.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password)});
async function run(cmd,args,input,env=process.env){const child=spawn(cmd,args,{windowsHide:true,stdio:['pipe','pipe','pipe'],env});let output='';child.stdout.on('data',c=>{output+=c;});child.stderr.on('data',c=>{output+=c;});child.stdin.end(input);await new Promise((ok,fail)=>{child.on('error',fail);child.on('close',code=>code===0?ok():fail(new Error(output.replaceAll(decodeURIComponent(url.password),'[redacted]'))));});}
try{
  await sql.query('CREATE DATABASE '+name+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  const dump=(await readFile(resolve(backup),'utf8')).replace(/\/\*!50017 DEFINER=[^\r\n]*?\*\//g,'');
  await run('C:/laragon/bin/mysql/mysql-8.0.30-winx64/bin/mysql.exe',['--host='+url.hostname,'--port='+url.port,'--user='+decodeURIComponent(url.username),'--default-character-set=utf8mb4',name],dump,{...process.env,MYSQL_PWD:decodeURIComponent(url.password)});
  await sql.query('USE '+name);const before=(await sql.query('SELECT COUNT(*) AS n FROM Product'))[0].n;
  url.pathname='/'+name;
  await run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--config','server/prisma.config.ts'],undefined,{...process.env,DATABASE_URL:url.toString()});
  await run(process.execPath,['node_modules/tsx/dist/cli.mjs','server/src/commerce-seed.ts'],undefined,{...process.env,DATABASE_URL:url.toString()});
  const after=(await sql.query('SELECT COUNT(*) AS n FROM Product'))[0].n,variants=(await sql.query('SELECT COUNT(*) AS n FROM ProductVariant'))[0].n,unreviewed=(await sql.query('SELECT COUNT(*) AS n FROM ProductVariant WHERE inventoryReviewed=0'))[0].n;
  if(before!==after||Number(variants)!==Number(before)||Number(unreviewed)!==Number(before))throw new Error('Migration preservation verification failed');
  console.log('Backup restored and all commerce migrations applied in an isolated local database. Product count preserved: '+after+'. All migrated inventory requires review.');
}finally{await sql.query('DROP DATABASE IF EXISTS '+name);await sql.end();}

// Recover only a zero-step commerce migration rejected by Linux table-name casing.
import {config} from 'dotenv';
import mariadb from 'mariadb';
import {spawnSync} from 'node:child_process';
config({quiet:true});
const url=new URL(process.env.DATABASE_URL);
const db=await mariadb.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),connectTimeout:10000,...(url.searchParams.get('ssl')==='true'?{ssl:true}:{})});
try{
  const failed=await db.query("SELECT applied_steps_count,logs FROM _prisma_migrations WHERE migration_name='202610030003_commerce' AND finished_at IS NULL AND rolled_back_at IS NULL");
  if(failed.length!==1||Number(failed[0].applied_steps_count)!==0||!failed[0].logs.includes('catalogcategory'))throw new Error('Recovery refuses an unexpected or partially applied migration');
  const columns=await db.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='CatalogCategory' AND COLUMN_NAME='parentSlug'");
  if(columns.length)throw new Error('Recovery refuses an existing commerce schema');
}finally{await db.end();}
const result=spawnSync(process.execPath,['../node_modules/prisma/build/index.js','migrate','resolve','--rolled-back','202610030003_commerce'],{cwd:'server',env:process.env,windowsHide:true,stdio:'inherit'});
if(result.status!==0)throw new Error('Migration resolution failed');
console.log('Zero-step casing failure cleared. No business data modified.');

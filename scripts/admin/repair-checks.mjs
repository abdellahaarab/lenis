// Additive recovery for the only pre-release migration that failed on MariaDB 11.8.
import{config}from'dotenv';
import{readFile}from'node:fs/promises';
import{spawnSync}from'node:child_process';
import mariadb from'mariadb';
config({quiet:true});
const url=new URL(process.env.DATABASE_URL);
const c=await mariadb.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),...(url.searchParams.get('ssl')==='true'?{ssl:true}:{})});
try{
  const sql=await readFile('server/prisma/mysql-migrations/202610030002_checks/migration.sql','utf8');
  for(const statement of sql.split(';').map(s=>s.trim()).filter(s=>s.includes('ALTER TABLE'))){
    const name=statement.match(/CONSTRAINT `([^`]+)`/)[1];
    const existing=await c.query('SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME=?',[name]);
    if(!existing.length)await c.query(statement);
  }
  const applied=await c.query("SELECT id FROM _prisma_migrations WHERE migration_name='202610030002_checks' AND finished_at IS NOT NULL AND rolled_back_at IS NULL");
  if(!applied.length){
    const result=spawnSync(process.execPath,['../node_modules/prisma/build/index.js','migrate','resolve','--applied','202610030002_checks'],{cwd:'server',env:process.env,stdio:'inherit',windowsHide:true});
    if(result.status!==0)throw new Error('Could not resolve migration');
  }
  console.log('All compatible CHECK constraints confirmed; no business data deleted or reset.');
}finally{await c.end();}

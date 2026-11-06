import {config} from 'dotenv';
import pg from 'pg';
import {mkdir,writeFile} from 'node:fs/promises';
config({quiet:true});
const url=process.env.LEGACY_DATABASE_URL??process.env.DATABASE_URL;
if(!url?.startsWith('postgres')) throw new Error('Set LEGACY_DATABASE_URL');
const client=new pg.Client({connectionString:url});
try {
  await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const tables=await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'");
  const data={format:'alarbi-postgresql-v1',exportedAt:new Date().toISOString(),tables:{}};
  for(const {tablename} of tables.rows){const r=await client.query('SELECT * FROM "'+tablename.replaceAll('"','""')+'"');data.tables[tablename]=r.rows;console.log(tablename+': '+r.rowCount);}
  await client.query('COMMIT');await mkdir('.backups',{recursive:true});
  const target='.backups/postgresql-'+Date.now()+'.json';await writeFile(target,JSON.stringify(data),{flag:'wx',mode:0o600});console.log('Private backup: '+target);
}finally{await client.end();}

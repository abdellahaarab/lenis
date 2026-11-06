import {readFile} from 'node:fs/promises';
import {loadConfig} from './config.js';
import {createDb} from './db.js';
import {Prisma} from '@prisma/client';
const input=process.argv[2];
if(!input) throw new Error('Usage: npm run db:legacy:import -- <private PostgreSQL export>');
const data=JSON.parse(await readFile(input,'utf8')) as {format:string;tables:Record<string,Record<string,unknown>[]>};
if(data.format!=='alarbi-postgresql-v1') throw new Error('Unsupported backup format');
const db=createDb(loadConfig().DATABASE_URL);
try {
  // Current legacy database has only users and audit; stop rather than discard business data.
  const other=Object.entries(data.tables).filter(([name,rows])=>!['User','AuditLog','Session'].includes(name)&&rows.length);
  if(other.length) throw new Error('Business data found: '+other.map(([name])=>name).join(', ')+'. Explicit business mapping is required. Original data remains safe.');
  const users=data.tables.User??[], audits=data.tables.AuditLog??[];
  await db.$transaction(async tx=>{
    for(const row of users) {
      const existing=await tx.user.findUnique({where:{id:String(row.id)}});
      if(existing) continue;
      const user={...row};
      for(const key of ['totpPendingUntil','lockedUntil','lastLoginAt','createdAt','updatedAt']) if(user[key]) user[key]=new Date(String(user[key]));
      if(user.totpLastCounter!=null) user.totpLastCounter=BigInt(String(user.totpLastCounter));
      await tx.user.create({data:user as Prisma.UserCreateInput});
    }
    for(const row of audits) {
      if(await tx.auditLog.findUnique({where:{id:String(row.id)}})) continue;
      await tx.auditLog.create({data:{...row,createdAt:new Date(String(row.createdAt)),before:row.before??Prisma.DbNull,after:row.after??Prisma.DbNull} as Prisma.AuditLogUncheckedCreateInput});
    }
  });
  console.log('Preserved '+users.length+' users and '+audits.length+' audit records. Sessions require sign-in again.');
} finally {await db.$disconnect();}

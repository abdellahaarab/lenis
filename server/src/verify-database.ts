import {createDb} from './db.js';
import {loadConfig} from './config.js';
const db=createDb(loadConfig().DATABASE_URL);
try{
  const version=await db.$queryRaw<{version:string}[]>`SELECT VERSION() AS version`;
  const counts={users:await db.user.count(),products:await db.product.count(),published:await db.product.count({where:{status:'published'}}),brands:await db.brand.count(),categories:await db.catalogCategory.count(),images:await db.mediaAsset.count(),content:await db.siteSetting.count(),audit:await db.auditLog.count()};
  const fks=await db.$queryRaw<unknown[]>`SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()`;
  const triggers=await db.$queryRaw<unknown[]>`SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()`;
  const images=await db.mediaAsset.findMany({select:{content:true}});
  if(images.some(m=>!m.content?.length))throw new Error('Missing image content');
  const audit=await db.auditLog.findFirst();let protectedUpdate=false,protectedDelete=false;
  if(audit){try{await db.auditLog.update({where:{id:audit.id},data:{action:audit.action}});}catch{protectedUpdate=true;}
    try{await db.$transaction(async tx=>{await tx.auditLog.delete({where:{id:audit.id}});throw new Error('Rollback protection test');});}catch(e){protectedDelete= !String(e).includes('Rollback protection test');}}
  console.log(JSON.stringify({version:version[0].version,counts,foreignKeys:fks.length,triggers:triggers.length,imageContentPresent:true,auditUpdateBlocked:protectedUpdate,auditDeleteBlocked:protectedDelete},null,2));
  if(!protectedUpdate||!protectedDelete) throw new Error('Audit protection verification failed');
}finally{await db.$disconnect();}

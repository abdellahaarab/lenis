import mariadb from 'mariadb';
import {loadConfig} from './config.js';
const url=new URL(loadConfig().DATABASE_URL);
const db=await mariadb.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),...(url.searchParams.get('ssl')==='true'?{ssl:true}:{})});
try{
  for(const operation of ['UPDATE','DELETE']){
    const name='AuditLog_no_'+operation.toLowerCase();
    const existing=await db.query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME=?',[name]);
    if(!existing.length) await db.query(`CREATE TRIGGER \`${name}\` BEFORE ${operation} ON \`AuditLog\` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit log is append-only'`);
  }
  console.log('Audit UPDATE and DELETE protection installed.');
  for(const operation of ['INSERT','UPDATE']){
    const name='ProductCompat_no_self_'+operation.toLowerCase();
    const existing=await db.query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME=?',[name]);
    if(!existing.length)await db.query(`CREATE TRIGGER \`${name}\` BEFORE ${operation} ON \`ProductCompat\` FOR EACH ROW BEGIN IF NEW.productId = NEW.otherProductId THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Self compatibility is invalid'; END IF; END`);
  }
}finally{await db.end();}

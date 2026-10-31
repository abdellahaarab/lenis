import {spawn} from 'node:child_process';
import {existsSync,openSync,closeSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import mariadb from 'mariadb';

export async function ensureLocalDatabase(raw){
  const url=new URL(raw);
  if(!['127.0.0.1','localhost','::1'].includes(url.hostname))throw new Error('Local development cannot connect to a remote database.');
  const options={host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),connectTimeout:1000};
  async function probe(){const connection=await mariadb.createConnection(options);await connection.end();}
  try{await probe();return;}catch(error){if(error.code==='ER_BAD_DB_ERROR'||error.code==='ER_ACCESS_DENIED_ERROR')throw new Error('Check the existing local database and .env credentials.',{cause:error});}
  const data=resolve('.local/mariadb');
  const bin=process.env.MYSQL_BIN??'C:/laragon/bin/mysql/mariadb-10.4.32-winx64/bin';
  const executable=join(bin,'mysqld.exe');
  if(process.platform!=='win32'||options.port!==53307||!existsSync(executable)||!existsSync(join(data,'root.private'))){
    throw new Error('Start the local database configured in .env before running start:local.');
  }
  if(options.user!=='root'||readFileSync(join(data,'root.private'),'utf8').trim()!==options.password)throw new Error('Local MariaDB configuration does not match this workspace.');
  const output=openSync(join(data,'preview-start.log'),'a');
  const child=spawn(executable,['--no-defaults','--datadir='+data,'--port=53307','--bind-address=127.0.0.1','--default-time-zone=+00:00','--console'],{windowsHide:true,detached:true,stdio:['ignore',output,output]});
  closeSync(output);let failed=false;child.on('error',()=>{failed=true;});child.unref();
  for(let attempt=0;attempt<40&&!failed;attempt++){
    await new Promise(r=>setTimeout(r,500));
    try{await probe();console.log('Local MariaDB ready on 127.0.0.1:53307.');return;}catch{}
  }
  throw new Error('Local MariaDB could not start. Check .local/mariadb/preview-start.log.');
}

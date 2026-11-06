import {config} from 'dotenv';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
config({path:'.env',quiet:true});
const url=new URL(process.env.DATABASE_URL);
if(!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Tests require local MariaDB');
const executable=process.execPath;
const child=spawn(executable,[resolve('node_modules/vitest/vitest.mjs'),'run','--no-file-parallelism','tests/auth.integration.test.ts','tests/commerce.integration.test.ts'],{cwd:resolve('server'),windowsHide:true,stdio:'inherit',env:{...process.env,TEST_DATABASE_URL:url.toString()}});
child.on('exit',code=>{process.exitCode=code??1;});


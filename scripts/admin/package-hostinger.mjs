import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const prebuilt=process.argv.includes('--prebuilt');
const packageJson=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
for(const artifact of ['dist/index.html','admin/dist/index.html','server/dist/index.js']){
  if(!existsSync(join(root,artifact)))throw new Error('Build all three applications before packaging.');
}
if(packageJson.scripts.prebuild.includes('generate-static-api'))throw new Error('Static API generation must not be enabled.');
if(!readFileSync(join(root,'server.js'),'utf8').includes("import('./server/dist/index.js')"))throw new Error('The Hostinger entry must use dynamic import.');
for(const dependency of ['@img/sharp-linux-x64','@img/sharp-libvips-linux-x64']){
  if(!packageJson.optionalDependencies?.[dependency])throw new Error('Linux runtime dependency missing: '+dependency);
}
const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=join(root,'.local','deploy',timestamp);
const staging=join(output,'source');
mkdirSync(staging,{recursive:true});
const excludedDirectories=new Set(['node_modules','dist','generated','tests','test-results','.git','.local','.backups','api']);
const excludedFiles=new Set(['apply-prelaunch-fixes.ts','seed-contest.ts','generate-static-api.ts']);
const files=[];
function collect(path){
  for(const entry of readdirSync(path,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw new Error('Source packaging refuses symbolic links.');
    if(entry.isDirectory()){
      if(!excludedDirectories.has(entry.name))collect(join(path,entry.name));
    }else if(entry.isFile()&&(!entry.name.startsWith('.env')||entry.name==='.env.example')
      &&!excludedFiles.has(entry.name)&&(! /\.(?:sql|private|log|zip|tsbuildinfo)$/.test(entry.name)
        ||relative(root,join(path,entry.name)).replaceAll('\\','/').startsWith('server/prisma/mysql-migrations/'))){
      const file=relative(root,join(path,entry.name)).replaceAll('\\','/');
      // Runtime uses WOFF2 fonts (~25KB each). Exclude massive uncompressed TTF/OTF fonts (~10.5MB)
      // to keep deployment package under Hostinger upload limits. Also exclude copied admin fonts.
      if(/^(MPLUSRounded1c-.*\.ttf|LinaRound-.*\.otf)$/.test(entry.name))continue;
      if(file.startsWith('admin/public/')&&/^(LinaRound-|MPLUSRounded1c-)/.test(entry.name))continue;
      files.push(file);
    }
  }
}
// Runtime fonts live in public. The fonts directory is an unused source copy.
for(const directory of ['src','public','admin','server','packages','scripts','docs'])collect(join(root,directory));
if(prebuilt){
  collect(join(root,'dist'));
  collect(join(root,'admin','dist'));
  collect(join(root,'packages','shared','dist'));
  files.push('server/dist/index.js');
}
for(const file of ['package.json','package-lock.json','server.js','app.js','index.html','vite.config.ts','tailwind.config.ts','postcss.config.js','tsconfig.json','tsconfig.node.json','eslint.config.mjs','.env.example','.gitignore','logo.webp','README.md','SKILL.md']){
  if(!existsSync(join(root,file)))throw new Error('Required source file missing: '+file);
  files.push(file);
}
if(files.some(file=>file.startsWith('public/api/')||file.startsWith('dist/api/')))throw new Error('Static API files must not be packaged.');
const manifest={createdAt:new Date().toISOString(),hostinger:{framework:'Other',node:'24.x',root:'./',build:prebuilt?'none':'npm run build',output:'.',entry:'server.js'},files:[]};
for(const file of [...new Set(files)].sort()){
  const destination=join(staging,file);mkdirSync(dirname(destination),{recursive:true});cpSync(join(root,file),destination);
  manifest.files.push({path:file,sha256:createHash('sha256').update(readFileSync(destination)).digest('hex')});
}
if(prebuilt){
  const stagedPackage=join(staging,'package.json');
  const stagedJson=JSON.parse(readFileSync(stagedPackage,'utf8'));
  stagedJson.scripts.postinstall='npm run db:generate -w @aljeel/server && node scripts/admin/verify-hostinger-runtime.mjs';
  writeFileSync(stagedPackage,JSON.stringify(stagedJson,null,2)+'\n');
  const packageEntry=manifest.files.find(entry=>entry.path==='package.json');
  packageEntry.sha256=createHash('sha256').update(readFileSync(stagedPackage)).digest('hex');
  const verified=spawnSync(process.execPath,[join(staging,'scripts/admin/verify-hostinger-runtime.mjs'),staging],{encoding:'utf8'});
  if(verified.status!==0)throw new Error('Hostinger runtime verification failed: '+(verified.stderr??verified.error?.message??'unknown error'));
}
writeFileSync(join(staging,'deploy-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const archive=join(output,'alarbi-hostinger-source.zip');
// bsdtar is bundled with Windows; zip is used on Unix hosts. No shell interpolation.
const result=process.platform==='win32'
  ?spawnSync('tar.exe',['--format','zip','-cf',archive,'-C',staging,'.'],{windowsHide:true,encoding:'utf8'})
  :spawnSync('zip',['-qr',archive,'.'],{cwd:staging,encoding:'utf8'});
if(result.status!==0)throw new Error('Source archive failed: '+(result.stderr??result.error?.message??'unknown error'));
const latest=join(root,'.local','alarbi-hostinger-source.zip');
cpSync(archive,latest);
console.log(JSON.stringify({archive,latest,sourceFiles:manifest.files.length,sha256:createHash('sha256').update(readFileSync(archive)).digest('hex'),hostinger:manifest.hostinger},null,2));

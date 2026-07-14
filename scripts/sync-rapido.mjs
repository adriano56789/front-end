import { Client } from 'ssh2';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const VPS_PASS = 'MshrUfZrh09hWr#';
const BACKEND_VPS = '/app/backend';
const FRONTEND_VPS = '/app/frontend';
const BACKEND_LOCAL = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\backend';
const FRONTEND_LOCAL = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\front-end';

const EXCLUDE = ['node_modules','dist/','build/','uploads/','.git/','.bak','.log','.env','package-lock','mongod.log','.tar','.zip'];

function isSource(f) {
  const l = f.toLowerCase();
  if (!f.trim()) return false;
  for (const e of EXCLUDE) if (l.includes(e)) return false;
  return f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.cjs') || f === 'package.json';
}

const conn = new Client();
conn.on('keyboard-interactive', (n,i,l,p,f) => f([VPS_PASS]));

await new Promise((ok,err) => {
  conn.on('ready', ok);
  conn.on('error', err);
  conn.connect({host:'2.25.192.154',port:22,username:'root',password:VPS_PASS,readyTimeout:15000,tryKeyboard:true});
});

console.log('✅ Conectado!\n');

function exec(cmd) {
  return new Promise((res,rej) => {
    conn.exec(cmd, (e,st) => {
      if (e) return rej(e);
      let out='',err='';
      st.on('data',d=>out+=d.toString());
      st.stderr.on('data',d=>err+=d.toString());
      st.on('close',()=>res({out,err}));
    });
  });
}

const sftp = await new Promise((ok,err) => conn.sftp((e,s)=>e?err(e):ok(s)));
const rFile = (p) => new Promise((ok,err) => sftp.readFile(p,(e,b)=>e?err(e):ok(b)));

let total = 0;

// Check BACKEND modified files
console.log('📁 BACKEND...');
let r = await exec(`cd ${BACKEND_VPS} && git diff --name-only && echo "---STAGED---" && git diff --cached --name-only && echo "---UNTRACKED---" && git ls-files --others --exclude-standard`);
const beFiles = r.out.split('\n').filter(isSource);
console.log(`   ${beFiles.length} arquivos-fonte modificados`);

for (const f of beFiles) {
  try {
    const vps = `${BACKEND_VPS}/${f}`;
    const local = join(BACKEND_LOCAL, f);
    const dir = dirname(local);
    if (!existsSync(dir)) mkdirSync(dir, {recursive:true});
    if (existsSync(local)) writeFileSync(local+'.bak', readFileSync(local));
    const data = await rFile(vps);
    writeFileSync(local, data);
    console.log(`   ✅ ${f}`);
    total++;
  } catch(e) { console.log(`   ⚠️  ${f} - ${e.message}`); }
}

// Check FRONTEND modified files
console.log('\n📁 FRONTEND...');
r = await exec(`cd ${FRONTEND_VPS} && git diff --name-only && echo "---STAGED---" && git diff --cached --name-only && echo "---UNTRACKED---" && git ls-files --others --exclude-standard`);
const feFiles = r.out.split('\n').filter(isSource);
console.log(`   ${feFiles.length} arquivos-fonte modificados`);

for (const f of feFiles) {
  try {
    const vps = `${FRONTEND_VPS}/${f}`;
    const local = join(FRONTEND_LOCAL, f);
    const dir = dirname(local);
    if (!existsSync(dir)) mkdirSync(dir, {recursive:true});
    if (existsSync(local)) writeFileSync(local+'.bak', readFileSync(local));
    const data = await rFile(vps);
    writeFileSync(local, data);
    console.log(`   ✅ ${f}`);
    total++;
  } catch(e) { console.log(`   ⚠️  ${f} - ${e.message}`); }
}

sftp.end();
conn.end();

console.log(`\n✅ Sincronização concluída! ${total} arquivos copiados.`);

import { Client } from 'ssh2';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PASS = 'MshrUfZrh09hWr#';
const FE_VPS = '/app/frontend';
const BE_VPS = '/app/backend';

const conn = new Client();
conn.on('keyboard-interactive', (n,i,l,p,f) => f([PASS]));

await new Promise((ok,err) => {
  conn.on('ready', ok);
  conn.on('error', err);
  conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASS,readyTimeout:15000,tryKeyboard:true});
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

// Search for ALL fetch() calls in source files on the VPS
console.log('🔍 Escavando fetch() na VPS...\n');

// Frontend
console.log('=== 📁 FRONTEND ===');
let r = await exec(`grep -rn "fetch(" ${FE_VPS}/services/ ${FE_VPS}/components/ ${FE_VPS}/hooks/ ${FE_VPS}/src/ ${FE_VPS}/utils/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" 2>/dev/null | grep -v "node_modules" | grep -v "//.*fetch" | grep -v "fetchData\\|fetchUser\\|fetchStream\\|fetchGift\\|fetchFrame\\|fetchAccount\\|fetchEarning\\|fetchProfile\\|fetchInitial\\|fetchFresh\\|fetchManual\\|fetchLive\\|fetchObra\\|fetchNotif" | head -50`);

if (r.out.trim()) {
  console.log('🔴 fetch() ENCONTRADO!\n' + r.out);
} else {
  console.log('✅ Nenhum fetch() encontrado no frontend');
}

// Backend  
console.log('\n=== 📁 BACKEND ===');
r = await exec(`grep -rn "fetch(" ${BE_VPS}/src/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v "//" | head -30`);
if (r.out.trim()) {
  console.log('🔴 fetch() ENCONTRADO!\n' + r.out);
} else {
  console.log('✅ Nenhum fetch() encontrado no backend');
}

// Check for .node-fetch or node-fetch imports in backend
console.log('\n=== 📁 node-fetch imports ===');
r = await exec(`grep -rn "node-fetch\\|require.*fetch\\|import.*fetch" ${BE_VPS}/src/ --include="*.ts" --include="*.js" 2>/dev/null | head -10`);
if (r.out.trim()) {
  console.log('🔴 node-fetch encontrado:\n' + r.out);
} else {
  console.log('✅ Nenhum node-fetch import');
}

// Check if the dist build has fetch in it
console.log('\n=== 📁 Build atual (dist) ===');
r = await exec(`grep -c "fetch(" ${FE_VPS}/dist/assets/index-*.js 2>/dev/null | head -3`);
console.log('fetch() no build:\n' + (r.out || '(sem build)'));

// Check XMLHttpRequest count in build
r = await exec(`grep -c "XMLHttpRequest" ${FE_VPS}/dist/assets/index-*.js 2>/dev/null | head -3`);
console.log('XMLHttpRequest no build:\n' + (r.out || '(sem build)'));

conn.end();
console.log('\n✅ Verificação concluída!');

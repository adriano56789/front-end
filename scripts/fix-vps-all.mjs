import { Client } from 'ssh2';

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

// ===== PASSO 1: CORRIGIR httpClient.ts NO BACKEND =====
console.log('🔧 PASSO 1: Corrigindo httpClient.ts no backend...\n');

// Read the file first
let r = await exec(`cat -n ${BE_VPS}/src/utils/httpClient.ts`);
const content = r.out;

// The fetch() calls are in 3 methods. Replace with http/https module approach.
// Let's check if axios is available first
r = await exec(`cd ${BE_VPS} && node -e "try{require('axios');console.log('axios OK')}catch(e){console.log('axios NOT_FOUND')}" 2>&1`);
console.log('axios:', r.out.trim());

// Check package.json for http libraries
r = await exec(`cd ${BE_VPS} && cat package.json | node -e "const j=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(JSON.stringify({...j.dependencies,...j.devDependencies},null,2))" 2>/dev/null | grep -i 'axios\\|got\\|request\\|node-fetch\\|undici'`);
console.log('HTTP libs no package.json:', r.out.trim() || '(nenhum)');

// Read the full httpClient.ts to understand the structure
console.log('\n📄 httpClient.ts completo:\n');
r = await exec(`cat -n ${BE_VPS}/src/utils/httpClient.ts`);
console.log(r.out.slice(0, 3000));

conn.end();

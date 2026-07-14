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

// Check frontend api.ts for fetch()
console.log('=== 📁 FRONTEND api.ts ===');
let r = await exec(`grep -n "fetch(" ${FE_VPS}/services/api.ts | head -20`);
if (r.out.trim()) {
  console.log('🔴 fetch() ENCONTRADO! Linhas:\n' + r.out);
} else {
  console.log('✅ Nenhum fetch() encontrado');
}

r = await exec(`grep -n "XMLHttpRequest" ${FE_VPS}/services/api.ts | head -5`);
console.log('\nXMLHttpRequest:\n' + (r.out || '(nenhum)'));

// Check for fetch in ALL frontend source files
console.log('\n=== 📁 TODOS fontes frontend ===');
r = await exec(`grep -rn "fetch(" ${FE_VPS}/services/ ${FE_VPS}/components/ ${FE_VPS}/hooks/ ${FE_VPS}/src/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v "//" | head -30`);
if (r.out.trim()) {
  console.log('🔴 fetch() encontrado em outros arquivos:\n' + r.out);
} else {
  console.log('✅ Nenhum fetch() em outros arquivos');
}

// Check backend api.ts for fetch()
console.log('\n=== 📁 BACKEND ===');
r = await exec(`grep -rn "fetch(" ${BE_VPS}/src/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | head -20`);
if (r.out.trim()) {
  console.log('🔴 fetch() encontrado no backend:\n' + r.out);
} else {
  console.log('✅ Nenhum fetch() no backend');
}

// Check dist files for fetch
console.log('\n=== 📁 Build (dist) - verificar tamanho ===');
r = await exec(`ls -la ${FE_VPS}/dist/assets/index-*.js 2>/dev/null | head -5`);
console.log(r.out || '(sem build)');

conn.end();
process.exit(0);

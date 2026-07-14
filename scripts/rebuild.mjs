import { Client } from 'ssh2';
const PASS = 'MshrUfZrh09hWr#';
const FE_VPS = '/app/frontend';

const conn = new Client();
conn.on('keyboard-interactive', (n,i,l,p,f) => f([PASS]));
await new Promise((ok,err) => {
  conn.on('ready', ok);
  conn.on('error', err);
  conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASS,readyTimeout:15000,tryKeyboard:true});
});

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

console.log('🔌 Conectado. Recompilando frontend...\n');
let r = await exec(`cd ${FE_VPS} && npm run build 2>&1`);
console.log(r.out.slice(0, 2000));
if (r.err) console.log('ERROS:', r.err.slice(0, 500));

// Verificar resultado
r = await exec(`grep -c "fetch(" ${FE_VPS}/dist/assets/index-*.js 2>/dev/null`);
console.log('\n📊 fetch() no NOVO build:', r.out.trim(), 'ocorrências');

r = await exec(`grep -c "XMLHttpRequest" ${FE_VPS}/dist/assets/index-*.js 2>/dev/null`);
console.log('📊 XMLHttpRequest no NOVO build:', r.out.trim(), 'ocorrências');

conn.end();
console.log('\n✅ Build concluído! Recarregue a página no navegador.');

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

console.log('📦 Recompilando frontend na VPS...\n');

let r = await exec(`cd ${FE_VPS} && npm run build 2>&1`);
console.log(r.out.slice(0, 2000));
if (r.err) console.log('ERROS:\n' + r.err.slice(0, 1000));

console.log('\n✅ Build concluído!');

r = await exec(`ls -la ${FE_VPS}/dist/assets/index-*.js 2>/dev/null | head -3`);
console.log('Arquivos gerados:\n' + (r.out || '(nenhum)'));

// Check the built file for fetch vs XHR
console.log('\n🔍 Verificando fetch vs XHR no build...');
r = await exec(`grep -c "XMLHttpRequest" ${FE_VPS}/dist/assets/index-*.js 2>/dev/null`);
console.log('XMLHttpRequest no build:', r.out.trim() || '0');

r = await exec(`grep -c "\.fetch(" ${FE_VPS}/dist/assets/index-*.js 2>/dev/null`);
console.log('fetch() no build:', r.out.trim() || '0');

// Restart nginx to clear any caches
console.log('\n🔄 Reiniciando nginx...');
r = await exec('nginx -s reload 2>&1 || systemctl reload nginx 2>&1 || service nginx reload 2>&1');
console.log(r.out || 'nginx reloaded');

conn.end();
process.exit(0);

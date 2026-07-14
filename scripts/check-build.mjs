import { Client } from 'ssh2';
const PASS = 'MshrUfZrh09hWr#';
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
console.log('=== BUILD VPS - fetch vs XHR ===\n');
let r = await exec(`grep -o "fetch(" /app/frontend/dist/assets/index-*.js 2>/dev/null | wc -l`);
console.log('fetch():       ' + r.out.trim());
r = await exec(`grep -o "XMLHttpRequest" /app/frontend/dist/assets/index-*.js 2>/dev/null | wc -l`);
console.log('XMLHttpRequest: ' + r.out.trim());
r = await exec(`ls -la /app/frontend/dist/assets/index-*.js 2>/dev/null`);
console.log('\nArquivos de build:\n' + (r.out || '(nenhum)'));
conn.end();

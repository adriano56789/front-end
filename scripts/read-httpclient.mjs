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

// Read the httpClient.ts file, focusing on the fetch() lines
let r = await exec(`cat -n /app/backend/src/utils/httpClient.ts | head -300`);
console.log('=== httpClient.ts (primeiras 300 linhas) ===\n' + r.out);

conn.end();

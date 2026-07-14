import { Client } from 'ssh2';
const PASS = 'MshrUfZrh09hWr#';
const conn = new Client();
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PASS]));
await new Promise((ok,err)=>{conn.on('ready',ok);conn.on('error',err);conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASS,readyTimeout:15000,tryKeyboard:true});});
function exec(cmd){return new Promise((res,rej)=>{conn.exec(cmd,(e,st)=>{if(e)return rej(e);let out='',err='';st.on('data',d=>out+=d.toString());st.stderr.on('data',d=>err+=d.toString());st.on('close',()=>res({out,err}));});});}

// Find what the fetch calls are about
let r = await exec(`grep -n "fetch(" /app/frontend/dist/assets/index-*.js 2>/dev/null | head -30`);
console.log('=== fetch() lines in build ===\n' + r.out.slice(0, 3000));

conn.end();

import { Client } from 'ssh2';
import { readFileSync } from 'fs';
const PASS = 'MshrUfZrh09hWr#';
const content = readFileSync('C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\backend\\src\\utils\\httpClient.ts');

const conn = new Client();
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PASS]));
await new Promise((ok,err)=>{conn.on('ready',ok);conn.on('error',err);conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASS,readyTimeout:15000,tryKeyboard:true});});

const sftp = await new Promise((ok,err)=>conn.sftp((e,s)=>e?err(e):ok(s)));
await new Promise((ok,err)=>sftp.writeFile('/app/backend/src/utils/httpClient.ts', content, err?err:ok));
sftp.end();

console.log('✅ httpClient.ts enviado para VPS!');
console.log('📄 Tamanho:', content.length, 'bytes');

// Verificar
function exec(cmd){return new Promise((res,rej)=>{conn.exec(cmd,(e,st)=>{if(e)return rej(e);let out='',err='';st.on('data',d=>out+=d.toString());st.stderr.on('data',d=>err+=d.toString());st.on('close',()=>res({out,err}));});});}
let r = await exec('grep -c "fetch(" /app/backend/src/utils/httpClient.ts');
console.log('fetch() restantes:', r.out.trim());
r = await exec('grep -c "http.request\\|https.request" /app/backend/src/utils/httpClient.ts');
console.log('http/https agora:', r.out.trim());

conn.end();

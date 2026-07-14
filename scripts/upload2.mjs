import { Client } from 'ssh2';
import { readFileSync } from 'fs';
const PASS = 'MshrUfZrh09hWr#';
const content = readFileSync('C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\backend\\src\\utils\\httpClient.ts');
const b64 = content.toString('base64');

const conn = new Client();
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PASS]));
await new Promise((ok,err)=>{conn.on('ready',ok);conn.on('error',err);conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASS,readyTimeout:15000,tryKeyboard:true});});

function exec(cmd){return new Promise((res,rej)=>{conn.exec(cmd,(e,st)=>{if(e)return rej(e);let out='',err='';st.on('data',d=>out+=d.toString());st.stderr.on('data',d=>err+=d.toString());st.on('close',()=>res({out,err}));});});}

const cmd = `echo "${b64}" | base64 -d > /app/backend/src/utils/httpClient.ts`;
let r = await exec(cmd);
console.log('Resultado:', r.out, r.err);

r = await exec('grep -c "fetch(" /app/backend/src/utils/httpClient.ts');
console.log('fetch() restantes:', r.out.trim());

r = await exec('grep -c "from.\\"http\\"\\|from.\\"https\\"" /app/backend/src/utils/httpClient.ts');
console.log('import http/https:', r.out.trim());

console.log('✅ httpClient.ts atualizado na VPS!');
conn.end();

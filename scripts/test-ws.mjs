import { Client } from 'ssh2';
const PASS = 'MshrUfZrh09hWr#';

const conn = new Client();
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PASS]));
await new Promise((ok,err)=>{conn.on('ready',ok);conn.on('error',err);conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASS,readyTimeout:15000,tryKeyboard:true});});

function exec(cmd){return new Promise((res,rej)=>{conn.exec(cmd,(e,st)=>{if(e)return rej(e);let out='',err='';st.on('data',d=>out+=d.toString());st.stderr.on('data',d=>err+=d.toString());st.on('close',()=>res({out,err}));});});}

// Test 1: Direct to backend
console.log('=== Teste 1: WS direto no backend (porta 3000) ===');
const script1 = `
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:3000/sig/v1/rtc', { timeout: 5000 });
ws.on('open', () => { console.log('CONECTADO!'); ws.close(); process.exit(0); });
ws.on('error', (e) => { console.log('ERRO:', e.message); process.exit(1); });
ws.on('unexpected-response', (req, res) => { console.log('HTTP:', res.statusCode); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
`;
const b64_1 = Buffer.from(script1).toString('base64');
let r = await exec(`node -e "eval(Buffer.from('${b64_1}','base64').toString())" 2>&1`);
console.log(r.out, r.err);

// Test 2: Direct to SRS
console.log('\n=== Teste 2: WS direto no SRS (porta 1985) ===');
const script2 = `
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:1985/rtc/v1/signal/', { timeout: 5000 });
ws.on('open', () => { console.log('CONECTADO!'); ws.close(); process.exit(0); });
ws.on('error', (e) => { console.log('ERRO:', e.message); process.exit(1); });
ws.on('unexpected-response', (req, res) => { console.log('HTTP:', res.statusCode); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
`;
const b64_2 = Buffer.from(script2).toString('base64');
r = await exec(`node -e "eval(Buffer.from('${b64_2}','base64').toString())" 2>&1`);
console.log(r.out, r.err);

// Test 3: Via nginx (WSS)
console.log('\n=== Teste 3: WS via nginx (wss://livego.store/sig/v1/rtc) ===');
const script3 = `
const WebSocket = require('ws');
const ws = new WebSocket('wss://livego.store/sig/v1/rtc', { rejectUnauthorized: false, timeout: 5000 });
ws.on('open', () => { console.log('CONECTADO!'); ws.close(); process.exit(0); });
ws.on('error', (e) => { console.log('ERRO:', e.message); process.exit(1); });
ws.on('unexpected-response', (req, res) => { console.log('HTTP:', res.statusCode); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
`;
const b64_3 = Buffer.from(script3).toString('base64');
r = await exec(`node -e "eval(Buffer.from('${b64_3}','base64').toString())" 2>&1`);
console.log(r.out, r.err);

conn.end();

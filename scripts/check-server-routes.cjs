const { Client } = require('ssh2');
const conn = new Client();
const PW = 'MshrUfZrh09hWr#';
function run(cmd){return new Promise(ok=>{conn.exec(cmd,{timeout:15000},(e,s)=>{let o='';s.stdout.on('data',d=>o+=d);s.stderr.on('data',d=>o+=d);s.on('close',()=>ok(o.trim()))})})}
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PW]));
conn.on('ready',async()=>{
  let r = await run('docker exec app-backend grep -n "app.use" /app/src/server.ts | head -40');
  console.log('=== app.use routes ===');
  console.log(r);
  
  r = await run('docker exec app-backend grep -n "voice" /app/src/server.ts');
  console.log('\n=== voice in server.ts ===');
  console.log(r);

  r = await run('docker exec app-backend grep -n "Live" /app/src/server.ts | head -10');
  console.log('\n=== Live references ===');
  console.log(r);

  // Check what catch-all exists
  r = await run("docker exec app-backend grep -n 'Live não encontrada' /app/src/routes/*.ts /app/routes/*.ts 2>/dev/null | head -5");
  console.log('\n=== Live nao encontrada source ===');
  console.log(r);

  conn.end();
}).connect({host:'2.25.192.154',port:22,username:'root',password:PW,tryKeyboard:true,readyTimeout:30000,keepaliveInterval:10000});

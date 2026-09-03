const { Client } = require('ssh2');
const conn = new Client();
const PW = 'MshrUfZrh09hWr#';
function run(cmd){return new Promise(ok=>{conn.exec(cmd,{timeout:15000},(e,s)=>{let o='';s.stdout.on('data',d=>o+=d);s.stderr.on('data',d=>o+=d);s.on('close',()=>ok(o.trim()))})})}
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PW]));
conn.on('ready',async()=>{
  // Show lines 380-420 of server.ts (around voice-rooms route)
  let r = await run('docker exec app-backend sed -n "380,420p" /app/src/server.ts');
  console.log('=== server.ts lines 380-420 ===');
  console.log(r);

  // Check likesRoutes - does it have a wildcard?
  r = await run('docker exec app-backend grep -n "router\\|app\\.use\\|get\\|post" /app/routes/likesRoutes.ts 2>/dev/null | head -20 || echo "not found in routes"');
  console.log('\n=== likesRoutes endpoints ===');
  console.log(r);
  r = await run('docker exec app-backend grep -n "router\\|app\\.use\\|get\\|post" /app/src/routes/likesRoutes.ts 2>/dev/null | head -20 || echo "not found in src"');
  console.log(r);

  // Find the "Live não encontrada" message
  r = await run("docker exec app-backend grep -rn 'Live' /app/routes/ 2>/dev/null | grep -i 'não\\|nao\\|not found\\|encontrada' | head -10");
  console.log('\n=== Live not found message source ===');
  console.log(r);

  // Check the catch-all middleware
  r = await run('docker exec app-backend sed -n "257,280p" /app/src/server.ts');
  console.log('\n=== Middleware around line 268 ===');
  console.log(r);

  conn.end();
}).connect({host:'2.25.192.154',port:22,username:'root',password:PW,tryKeyboard:true,readyTimeout:30000,keepaliveInterval:10000});

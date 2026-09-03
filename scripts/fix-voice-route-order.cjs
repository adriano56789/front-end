const { Client } = require('ssh2');
const conn = new Client();
const PW = 'MshrUfZrh09hWr#';
function run(cmd, t){return new Promise(ok=>{conn.exec(cmd,{timeout:t||15000},(e,s)=>{let o='';s.stdout.on('data',d=>o+=d);s.stderr.on('data',d=>o+=d);s.on('close',()=>ok(o.trim()))})})}
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PW]));
conn.on('ready',async()=>{
  // 1. Remover as 2 linhas existentes de voiceRoomRoutes
  console.log('1. Removendo linhas antigas...');
  await run("docker exec app-backend sed -i '/voiceRoomRoutes/d' /app/src/server.ts");

  // 2. Adicionar ANTES do liveRoutes
  console.log('2. Adicionando voiceRoomRoutes ANTES de liveRoutes...');
  // Encontrar linha do liveRoutes
  let r = await run("docker exec app-backend grep -n \"liveRoutes\" /app/src/server.ts | grep 'app.use' | head -1 | cut -d: -f1");
  console.log('   liveRoutes na linha:', r);
  const lineNum = parseInt(r);
  
  if (lineNum) {
    // Adicionar import antes do import de liveRoutes
    let liveImport = await run("docker exec app-backend grep -n \"import.*liveRoutes\" /app/src/server.ts | head -1 | cut -d: -f1");
    console.log('   import liveRoutes na linha:', liveImport);
    
    if (liveImport) {
      await run(`docker exec app-backend sed -i "${liveImport}a\\import voiceRoomRoutes from './routes/voiceRoomRoutes';" /app/src/server.ts`);
    }
    
    // Recalcular linha do liveRoutes (pode ter mudado por causa do import)
    let newLine = await run("docker exec app-backend grep -n \"app.use.*liveRoutes\" /app/src/server.ts | head -1 | cut -d: -f1");
    console.log('   app.use liveRoutes agora na linha:', newLine);
    
    if (newLine) {
      await run(`docker exec app-backend sed -i "${newLine}a\\app.use('/api/voice-rooms', voiceRoomRoutes);" /app/src/server.ts`);
    }
  }

  // 3. Verificar
  r = await run("docker exec app-backend grep -n voiceRoomRoutes /app/src/server.ts");
  console.log('\n3. Verificação:');
  console.log(r);

  // 4. Reiniciar
  console.log('\n4. Reiniciando...');
  await run("docker restart app-backend");
  await new Promise(res => setTimeout(res, 8000));

  r = await run("docker ps --filter name=app-backend --format '{{.Status}}'");
  console.log('   Status:', r);

  // 5. Testar
  r = await run("curl -s http://localhost:3000/api/voice-rooms");
  console.log('\n5. GET /api/voice-rooms:', r.substring(0, 300));

  r = await run("curl -s -X POST http://localhost:3000/api/voice-rooms -H 'Content-Type: application/json' -d '{\"hostId\":\"testDeploy\",\"name\":\"Sala Final\"}'");
  console.log('\n6. POST criar sala:', r.substring(0, 300));

  r = await run("curl -s http://localhost:3000/api/voice-rooms");
  console.log('\n7. GET depois de criar:', r.substring(0, 500));

  console.log('\n✅ PRONTO');
  conn.end();
}).connect({host:'2.25.192.154',port:22,username:'root',password:PW,tryKeyboard:true,readyTimeout:30000,keepaliveInterval:10000});

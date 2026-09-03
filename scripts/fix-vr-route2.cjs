const { Client } = require('ssh2');
const conn = new Client();
const PW = 'MshrUfZrh09hWr#';
function run(cmd, t){return new Promise(ok=>{conn.exec(cmd,{timeout:t||30000},(e,s)=>{let o='';s.stdout.on('data',d=>o+=d);s.stderr.on('data',d=>o+=d);s.on('close',()=>ok(o.trim()))})})}
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PW]));
conn.on('ready',async()=>{

  // 1. Remove old lines
  await run("docker exec app-backend sed -i '/voiceRoomRoutes/d' /app/src/server.ts");
  console.log('1. Linhas antigas removidas');

  // 2. Find liveRoutes line number
  let r = await run("docker exec app-backend grep -n \"app.use.*liveRoutes\" /app/src/server.ts | head -1 | cut -d: -f1");
  console.log('2. liveRoutes line:', r);
  const n = parseInt(r);

  // 3. Write a simple shell script that uses the line number
  const insertScript = 'LINE=' + n + '\nsed -i "$LINE i import voiceRoomRoutes from \'./routes/voiceRoomRoutes\';" /app/src/server.ts\n';

  await new Promise(ok => {
    conn.sftp((err, sftp) => {
      const ws = sftp.createWriteStream('/tmp/insert-vr.sh');
      ws.end(insertScript);
      ws.on('close', ok);
    });
  });
  await run("chmod +x /tmp/insert-vr.sh");
  await run("docker cp /tmp/insert-vr.sh app-backend:/tmp/insert-vr.sh");
  r = await run("docker exec app-backend bash /tmp/insert-vr.sh");
  console.log('3. Import inserido:', r);

  // 4. Find liveRoutes again (may have shifted +1)
  r = await run("docker exec app-backend grep -n \"app.use.*liveRoutes\" /app/src/server.ts | head -1 | cut -d: -f1");
  const m = parseInt(r);
  console.log('4. liveRoutes agora na linha:', m);

  // 5. Insert app.use BEFORE liveRoutes
  const insertUse = 'LINE=' + m + '\nsed -i "$LINE i app.use(\'/api/voice-rooms\', voiceRoomRoutes);" /app/src/server.ts\n';

  await new Promise(ok => {
    conn.sftp((err, sftp) => {
      const ws = sftp.createWriteStream('/tmp/insert-use.sh');
      ws.end(insertUse);
      ws.on('close', ok);
    });
  });
  await run("docker cp /tmp/insert-use.sh app-backend:/tmp/insert-use.sh");
  r = await run("docker exec app-backend bash /tmp/insert-use.sh");
  console.log('5. app.use inserido:', r);

  // 6. Verify
  r = await run("docker exec app-backend grep -n voiceRoomRoutes /app/src/server.ts");
  console.log('6. Verificado:');
  console.log(r);

  // 7. Restart
  await run("docker restart app-backend");
  console.log('7. Reiniciando...');
  await new Promise(res => setTimeout(res, 8000));

  r = await run("docker ps --filter name=app-backend --format '{{.Status}}'");
  console.log('8. Status:', r);

  // 8. Test GET
  r = await run("curl -s http://localhost:3000/api/voice-rooms");
  console.log('\n9. GET /api/voice-rooms:');
  console.log(r.substring(0, 500));

  // 9. Test POST
  r = await run("curl -s -X POST http://localhost:3000/api/voice-rooms -H 'Content-Type: application/json' -d '{\"hostId\":\"finalTest\",\"name\":\"Sala Final\"}'");
  console.log('\n10. POST criar sala:');
  console.log(r.substring(0, 400));

  // 10. Test GET again
  r = await run("curl -s http://localhost:3000/api/voice-rooms");
  console.log('\n11. GET depois de criar:');
  console.log(r.substring(0, 500));

  console.log('\n✅ DEPLOY CONCLUIDO');
  conn.end();
}).connect({host:'2.25.192.154',port:22,username:'root',password:PW,tryKeyboard:true,readyTimeout:30000,keepaliveInterval:10000});

const { Client } = require('ssh2');
const conn = new Client();
const PW = 'MshrUfZrh09hWr#';
function run(cmd, t){return new Promise(ok=>{conn.exec(cmd,{timeout:t||30000},(e,s)=>{let o='';s.stdout.on('data',d=>o+=d);s.stderr.on('data',d=>o+=d);s.on('close',()=>ok(o.trim()))})})}
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PW]));
conn.on('ready',async()=>{
  // Write a patch script and upload
  const patchScript = `
#!/bin/bash
cd /app

# Remove any existing voiceRoomRoutes lines
sed -i '/voiceRoomRoutes/d' src/server.ts

# Find the liveRoutes app.use line
LIVE_LINE=$(grep -n "app.use.*'/api'.*liveRoutes" src/server.ts | head -1 | cut -d: -f1)
echo "liveRoutes at line: $LIVE_LINE"

# Insert voiceRoomRoutes BEFORE liveRoutes
sed -i "${LIVE_LINE}i import voiceRoomRoutes from './routes/voiceRoomRoutes';\\
app.use('/api/voice-rooms', voiceRoomRoutes);" src/server.ts

# Verify
grep -n voiceRoomRoutes src/server.ts
`;

  await new Promise(ok => {
    conn.sftp((err, sftp) => {
      const ws = sftp.createWriteStream('/tmp/fix-vr.sh');
      ws.end(patchScript);
      ws.on('close', ok);
    });
  });

  await run('chmod +x /tmp/fix-vr.sh');
  await run('docker cp /tmp/fix-vr.sh app-backend:/tmp/fix-vr.sh');
  let r = await run('docker exec app-backend bash /tmp/fix-vr.sh');
  console.log('1. Patch aplicado:');
  console.log(r);

  // Restart
  await run('docker restart app-backend');
  console.log('\n2. Reiniciando...');
  await new Promise(res => setTimeout(res, 8000));

  r = await run('docker ps --filter name=app-backend --format {{.Status}}');
  console.log('3. Status:', r);

  // Test
  r = await run("curl -s http://localhost:3000/api/voice-rooms");
  console.log('\n4. GET /api/voice-rooms:');
  console.log(r.substring(0, 500));

  r = await run("curl -s -X POST http://localhost:3000/api/voice-rooms -H 'Content-Type: application/json' -d '{\"hostId\":\"final\",\"name\":\"Sala Final\"}'");
  console.log('\n5. POST criar:');
  console.log(r.substring(0, 300));

  r = await run("curl -s http://localhost:3000/api/voice-rooms");
  console.log('\n6. GET depois:');
  console.log(r.substring(0, 500));

  conn.end();
}).connect({host:'2.25.192.154',port:22,username:'root',password:PW,tryKeyboard:true,readyTimeout:30000,keepaliveInterval:10000});

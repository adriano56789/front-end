const { Client } = require('ssh2');
const fs = require('fs');
const PW = 'MshrUfZrh09hWr#';
let c;

function connect(attempt) {
  return new Promise((resolve, reject) => {
    const x = new Client();
    x.on('keyboard-interactive', (n,i,l,p,f) => f([PW]));
    x.on('ready', () => resolve(x));
    x.on('error', (e) => {
      if (attempt < 15) setTimeout(() => connect(attempt+1).then(resolve,reject), 2000);
      else reject(e);
    });
    x.connect({host:'2.25.192.154',port:22,username:'root',password:PW,tryKeyboard:true,readyTimeout:30000,keepaliveInterval:10000});
  });
}

function run(cmd, t) {
  return new Promise(ok => {
    c.exec(cmd, {timeout:t||60000}, (e,s) => {
      let o=''; s.stdout.on('data',d=>o+=d); s.stderr.on('data',d=>o+=d);
      s.on('close',()=>ok(o.trim()));
    });
  });
}

// Upload a node script that edits dist/server.js on the container
const editScript = `
const fs = require('fs');
const file = '/app/dist/server.js';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\\n');

// Find voiceRoomRoutes app.use line (line ~424)
const vrUseIdx = lines.findIndex(l => l.includes("app.use('/api/voice-rooms'"));
// Find liveRoutes app.use line (line ~417)
const lrUseIdx = lines.findIndex(l => l.includes("app.use('/api', liveRoutes_1.default)"));

console.log('voiceRoomRoutes app.use at:', vrUseIdx + 1);
console.log('liveRoutes app.use at:', lrUseIdx + 1);

if (vrUseIdx >= 0 && lrUseIdx >= 0 && vrUseIdx > lrUseIdx) {
  // Remove voiceRoomRoutes line
  const vrLine = lines.splice(vrUseIdx, 1)[0];
  // Find where liveRoutes is now (may have shifted)
  const newLrIdx = lines.findIndex(l => l.includes("app.use('/api', liveRoutes_1.default)"));
  // Insert BEFORE liveRoutes
  lines.splice(newLrIdx, 0, vrLine);
  console.log('Moved voiceRoomRoutes app.use BEFORE liveRoutes');
  
  fs.writeFileSync(file, lines.join('\\n'));
  console.log('File saved');
} else {
  console.log('Nothing to move or already in correct order');
}

// Verify
const final = fs.readFileSync(file, 'utf8').split('\\n');
const newVr = final.findIndex(l => l.includes("app.use('/api/voice-rooms'"));
const newLr = final.findIndex(l => l.includes("app.use('/api', liveRoutes_1.default)"));
console.log('Final: voiceRoomRoutes at line', newVr + 1, ', liveRoutes at line', newLr + 1);
`;

async function main() {
  c = await connect(1);
  console.log('Connected');

  // Upload edit script
  await new Promise(ok => {
    c.sftp((err, sftp) => {
      const ws = sftp.createWriteStream('/tmp/fix-dist.js');
      ws.end(editScript);
      ws.on('close', ok);
    });
  });

  // Copy to container and run
  await run('docker cp /tmp/fix-dist.js app-backend:/tmp/fix-dist.js');
  let r = await run('docker exec app-backend node /tmp/fix-dist.js');
  console.log(r);

  // Restart
  console.log('\nReiniciando...');
  await run('docker restart app-backend');
  await new Promise(res => setTimeout(res, 8000));

  r = await run('docker ps --filter name=app-backend --format "{{.Status}}"');
  console.log('Status:', r);

  // Test
  r = await run("curl -s http://localhost:3000/api/voice-rooms");
  console.log('\nGET /api/voice-rooms:', r.substring(0, 500));

  r = await run("curl -s -X POST http://localhost:3000/api/voice-rooms -H 'Content-Type: application/json' -d '{\"hostId\":\"fix\",\"name\":\"Sala Fix\"}'");
  console.log('\nPOST criar:', r.substring(0, 300));

  r = await run("curl -s http://localhost:3000/api/voice-rooms");
  console.log('\nGET depois:', r.substring(0, 500));

  c.end();
}

main().catch(e => { console.log('ERR:', e.message); process.exit(1); });

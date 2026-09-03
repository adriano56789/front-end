const { Client } = require('ssh2');
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
    c.exec(cmd, {timeout:t||30000}, (e,s) => {
      let o=''; s.stdout.on('data',d=>o+=d); s.stderr.on('data',d=>o+=d);
      s.on('close',()=>ok(o.trim()));
    });
  });
}

async function main() {
  c = await connect(1);
  console.log('Connected');

  // Backup the trashed server.ts and restore from dist/server.js (rename as .bak)
  let r = await run('docker exec app-backend cp /app/src/server.ts /app/src/server.ts.bak.trashed');
  console.log('Backed up trashed server.ts');

  // Get the line count of the original server.ts by extracting from dist/server.js
  // We know the original had ~420 lines. Let's rebuild from the dist
  // Actually, let's just fix the source properly: remove all voiceRoomRoutes duplicate lines
  // and add back just 2 clean lines
  
  // Step 1: Remove ALL voiceRoomRoutes lines
  r = await run('docker exec app-backend sed -i /voiceRoomRoutes/d /app/src/server.ts');
  console.log('Removed all voiceRoomRoutes lines');

  r = await run('docker exec app-backend wc -l /app/src/server.ts');
  console.log('Lines after cleanup:', r);

  // The file should now be back to ~original size minus the original 2 voiceRoomRoutes lines
  // Now add them back properly using a node script
  const fixScript = `const fs = require('fs');
const f = '/app/src/server.ts';
let c = fs.readFileSync(f,'utf8');
const lines = c.split('\\n');

// Find the import for liveRoutes
const lrImportIdx = lines.findIndex(l => l.includes("import") && l.includes("liveRoutes") && l.includes("from"));
console.log('liveRoutes import at:', lrImportIdx + 1);

// Insert voiceRoomRoutes import BEFORE liveRoutes import
if (lrImportIdx >= 0) {
  lines.splice(lrImportIdx, 0, "import voiceRoomRoutes from './routes/voiceRoomRoutes';");
}

// Find liveRoutes app.use
const lrUseIdx = lines.findIndex(l => l.includes("app.use") && l.includes("liveRoutes"));
console.log('liveRoutes app.use at:', lrUseIdx + 1);

// Insert voiceRoomRoutes app.use BEFORE liveRoutes
if (lrUseIdx >= 0) {
  lines.splice(lrUseIdx, 0, "app.use('/api/voice-rooms', voiceRoomRoutes);");
}

fs.writeFileSync(f, lines.join('\\n'));
console.log('Fixed! voiceRoomRoutes now before liveRoutes');
`;

  await new Promise(ok => {
    c.sftp((err, sftp) => {
      const ws = sftp.createWriteStream('/tmp/fix-src.js');
      ws.end(fixScript);
      ws.on('close', ok);
    });
  });
  await run('docker cp /tmp/fix-src.js app-backend:/tmp/fix-src.js');
  r = await run('docker exec app-backend node /tmp/fix-src.js');
  console.log(r);

  // Verify
  r = await run('docker exec app-backend grep -n voiceRoomRoutes /app/src/server.ts');
  console.log('\nserver.ts voiceRoomRoutes:');
  console.log(r);

  r = await run('docker exec app-backend wc -l /app/src/server.ts');
  console.log('Final line count:', r);

  console.log('\n✅ Source file fixed');
  c.end();
}

main().catch(e => { console.log('ERR:', e.message); process.exit(1); });

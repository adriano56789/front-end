const { Client } = require('ssh2');
const conn = new Client();
const PW = 'MshrUfZrh09hWr#';

function connect(attempt) {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('keyboard-interactive', (n,i,l,p,f) => f([PW]));
    c.on('ready', () => resolve(c));
    c.on('error', (e) => {
      if (attempt < 15) setTimeout(() => connect(attempt+1).then(resolve,reject), 2000);
      else reject(e);
    });
    c.connect({host:'2.25.192.154',port:22,username:'root',password:PW,tryKeyboard:true,readyTimeout:30000,keepaliveInterval:10000});
  });
}

function run(cmd, t) {
  return new Promise(ok => {
    conn.exec(cmd, {timeout:t||30000}, (e,s) => {
      let o=''; s.stdout.on('data',d=>o+=d); s.stderr.on('data',d=>o+=d);
      s.on('close',()=>ok(o.trim()));
    });
  });
}

async function main() {
  conn = await connect(1);
  console.log('Connected');

  // 1. Check if running from dist or src
  let r = await run('docker exec app-backend wc -l /app/src/server.ts /app/dist/server.js');
  console.log('File sizes:', r);

  // 2. Check current server.ts line count (should be huge after our mess)
  r = await run('docker exec app-backend wc -l /app/src/server.ts');
  console.log('server.ts lines now:', r);

  // 3. Get the compiled server.js - check if voiceRoomRoutes is in it
  r = await run('docker exec app-backend grep -c voiceRoomRoutes /app/dist/server.js');
  console.log('voiceRoomRoutes in dist:', r);

  // 4. Check what the server is actually running
  r = await run('docker exec app-backend head -5 /app/dist/server.js');
  console.log('dist/server.js head:', r);

  // 5. The server.ts is trashed but dist/server.js is fine. 
  //    We need to add voice-rooms route to dist/server.js directly
  //    OR restore server.ts and recompile

  // Let's try: find original backup or restore from backup
  r = await run('docker exec app-backend ls /app/src/server.ts.bak 2>/dev/null || echo NO_BAK');
  console.log('backup:', r);

  // Check if git can restore
  r = await run('docker exec app-backend sh -c "cd /app && git checkout -- src/server.ts 2>&1 || echo GIT_FAIL"');
  console.log('git restore:', r);

  r = await run('docker exec app-backend wc -l /app/src/server.ts');
  console.log('server.ts lines after restore:', r);

  conn.end();
}

main().catch(e => { console.log('ERR:', e.message); process.exit(1); });

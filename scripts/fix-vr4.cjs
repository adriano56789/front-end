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

  // Restore server.ts from git
  let r = await run('docker exec app-backend sh -c "cd /app && git checkout -- src/server.ts 2>&1 || echo GIT_FAIL"');
  console.log('git restore:', r);

  r = await run('docker exec app-backend wc -l /app/src/server.ts');
  console.log('server.ts lines after restore:', r);

  // Check voiceRoomRoutes in dist
  r = await run('docker exec app-backend grep -c voiceRoomRoutes /app/dist/server.js 2>/dev/null || echo 0');
  console.log('voiceRoomRoutes in dist/server.js:', r);

  // Check liveRoutes line in server.ts
  r = await run('docker exec app-backend grep -n "app.use.*liveRoutes" /app/src/server.ts | head -1 | cut -d: -f1');
  console.log('liveRoutes at line:', r);

  c.end();
}

main().catch(e => { console.log('ERR:', e.message); process.exit(1); });

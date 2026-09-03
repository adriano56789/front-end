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
    c.exec(cmd, {timeout:t||60000}, (e,s) => {
      let o=''; s.stdout.on('data',d=>o+=d); s.stderr.on('data',d=>o+=d);
      s.on('close',()=>ok(o.trim()));
    });
  });
}

async function main() {
  c = await connect(1);
  console.log('Connected');

  // 1. Find the voiceRoomRoutes and liveRoutes lines in dist/server.js
  let r = await run('docker exec app-backend grep -n "voiceRoomRoutes\\|liveRoutes" /app/dist/server.js | head -20');
  console.log('Routes in dist/server.js:');
  console.log(r);

  // 2. Find the liveRoutes app.use line
  r = await run('docker exec app-backend grep -n "app.use.*liveRoutes" /app/dist/server.js | head -1 | cut -d: -f1');
  console.log('\nliveRoutes app.use at line:', r);

  // 3. Find voiceRoomRoutes app.use line
  r = await run('docker exec app-backend grep -n "app.use.*voiceRoomRoutes" /app/dist/server.js | head -1 | cut -d: -f1');
  console.log('voiceRoomRoutes app.use at line:', r);

  // 4. Check: is the "Live não encontrada" in liveRoutes?
  r = await run("docker exec app-backend grep -n 'Live' /app/dist/server.js | head -5");
  console.log('\n"Live" references:', r);

  // 5. Show lines around the liveRoutes app.use to understand context
  const liveLine = parseInt(r || '0');
  if (liveLine > 0) {
    r = await run(`docker exec app-backend sed -n "${liveLine-2},${liveLine+2}p" /app/dist/server.js`);
    console.log('\nContext around liveRoutes:', r);
  }

  c.end();
}

main().catch(e => { console.log('ERR:', e.message); process.exit(1); });

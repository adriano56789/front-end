const { Client } = require('ssh2');
const c = new Client();
const PASS = 'MshrUfZrh09hWr#';
const run = (cmd) => new Promise((res) => c.exec(cmd, (e, s) => { let o=''; s.on('data',d=>o+=d); s.stderr.on('data',d=>o+=d); s.on('close',()=>res(o)); }));
c.on('ready', async () => {
  console.log('--- docker-compose.yml (mongodb + ports) ---');
  console.log(await run('cat /app/docker-compose.yml'));
  console.log('--- portas abertas no host ---');
  console.log(await run('ss -tlnp | grep -E "27017|3000" || echo "nada exposto"'));
  console.log('--- mongo pede auth? ---');
  console.log(await run('docker exec app-mongodb mongosh --quiet --eval "db.adminCommand({connectionStatus:1}).authInfo.authedUsers.length" 2>&1 | head -5'));
  c.end();
}).connect({ host:'2.25.192.154', port:22, username:'root', tryKeyboard:true, readyTimeout:15000, connTimeout:15000 })
.on('keyboard-interactive',(n,i,il,p,f)=>f(p.map(()=>PASS)));
setTimeout(()=>process.exit(0), 40000);

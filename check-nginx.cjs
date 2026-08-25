const {Client} = require('ssh2');

const HOST = '2.25.192.154';
const PW = 'MshrUfZrh09hWr#';

function connect() {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('keyboard-interactive', (n,i,l,p,f) => f(p.map(() => PW)));
    c.on('ready', () => resolve(c));
    c.on('error', reject);
    c.connect({host:HOST, port:22, username:'root', password:PW, tryKeyboard:true, readyTimeout:30000, keepaliveInterval:15000});
  });
}

function sshExec(c, cmd, timeout=15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve('TIMEOUT'), timeout);
    c.exec(cmd, (e, r) => {
      if (e) { clearTimeout(t); return reject(e); }
      let d = '';
      r.on('data', d2 => d += d2);
      r.stderr.on('data', d2 => d += d2);
      r.on('close', () => { clearTimeout(t); resolve(d); });
    });
  });
}

async function main() {
  const c = await connect();
  console.log('Connected!');

  // 1. First undo the bad patch on api-livego-store
  console.log('=== Undoing api-livego-store patch ===');
  await sshExec(c, `sed -i '/Never cache index.html/,/}/d' /etc/nginx/sites-enabled/api-livego-store`);
  
  // 2. Read the livego config (frontend)
  const livegoConfig = await sshExec(c, 'cat /etc/nginx/sites-enabled/livego');
  console.log('=== livego config ===');
  console.log(livegoConfig);
  
  // 3. Read the livego.new config
  const livegoNew = await sshExec(c, 'cat /etc/nginx/sites-enabled/livego.new 2>/dev/null || echo "NOT FOUND"');
  console.log('=== livego.new config ===');
  console.log(livegoNew);

  // 4. Check which config actually serves livego.store frontend
  const whichConfig = await sshExec(c, 'grep -l "livego.store" /etc/nginx/sites-enabled/livego /etc/nginx/sites-enabled/livego.new 2>/dev/null || echo "none"');
  console.log('Which configs mention livego.store:', whichConfig);

  c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });

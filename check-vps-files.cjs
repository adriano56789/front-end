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

function sshExec(c, cmd, timeout=30000) {
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

  const dirs = await sshExec(c, 'ls -d /var/www/livego.store/*/ 2>/dev/null');
  console.log('Folders on VPS:', dirs.trim());
  
  const fileCount = await sshExec(c, 'find /var/www/livego.store -type f | wc -l');
  console.log('Total files on VPS:', fileCount.trim());
  
  const folderCounts = await sshExec(c, 'for d in /var/www/livego.store/*/; do echo "$(find "$d" -type f | wc -l) $d"; done');
  console.log('Files per folder:', folderCounts.trim());
  
  const rootFiles = await sshExec(c, 'ls /var/www/livego.store/');
  console.log('Root contents:', rootFiles.trim());

  c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });

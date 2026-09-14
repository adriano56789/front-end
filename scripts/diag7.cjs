const { Client } = require('ssh2');

const SCRIPT = `#!/bin/bash
echo "=== GIT DIRS ==="
find /var/www /app /root -maxdepth 3 -name ".git" -type d 2>/dev/null
echo "=== GIT STATUS /var/www/livego.store ==="
cd /var/www/livego.store 2>/dev/null && git status 2>&1 | head -30; echo "---"
cd /var/www/livego.store 2>/dev/null && git log --oneline -10 2>&1 | head -15; echo "---"
echo "=== LIVE GO DIST TAR ==="
ls -la /root/livego-dist.tar 2>&1
tar -tzf /root/livego-dist.tar 2>&1 | head -20
echo "=== ASSETS CURRENT ==="
ls -la /var/www/livego.store/assets/ 2>&1 | head -30
echo "=== ASSETS COUNT/SIZE ==="
ls -la /var/www/livego.store/assets/ 2>&1 | awk 'NR>1 {c++; if($5==0) z++} END {print "total="c" zero="z}'
`;

const b64 = Buffer.from(SCRIPT).toString('base64');

const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); process.exit(1); } }, 120000);

conn.on('ready', () => {
  console.log('[SSH] OK');
  conn.exec(`echo ${b64} | base64 -d | bash`, (e, stream) => {
    if (e) { console.error(e); clearTimeout(timer); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { done = true; clearTimeout(timer); conn.end(); });
  });
}).on('error', e => {
  console.error('[SSH] Error:', e.message);
  clearTimeout(timer);
}).connect({
  host: '2.25.192.154', port: 22, username: 'root',
  password: 'MshrUfZrh09hWr#', readyTimeout: 30000
});
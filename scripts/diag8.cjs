const { Client } = require('ssh2');

const SCRIPT = `#!/bin/bash
echo "=== BACKEND GIT STATUS ==="
cd /app/backend && git status 2>&1 | head -40
echo "=== BACKEND GIT LOG 15 ==="
cd /app/backend && git log --oneline -15 2>&1
echo "=== BACKEND REMOTE ==="
cd /app/backend && git remote -v 2>&1
echo "=== TAR TYPE ==="
file /root/livego-dist.tar
echo "=== TAR LISTING (30) ==="
tar -tf /root/livego-dist.tar 2>&1 | head -30
echo "=== TAR ASSETS ==="
tar -tf /root/livego-dist.tar 2>&1 | grep -c assets/
tar -tf /root/livego-dist.tar 2>&1 | grep assets/ | head -25
echo "=== TAR INDEX ==="
tar -tf /root/livego-dist.tar 2>&1 | grep -E "index.html|sw.js|version.json"
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
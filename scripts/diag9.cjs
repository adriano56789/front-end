const { Client } = require('ssh2');

const SCRIPT = `#!/bin/bash
echo "=== ZERO BYTE FILES ==="
find /var/www/livego.store -type f -size 0 -printf "%P\\n" 2>/dev/null
echo "=== ZERO COUNT ==="
find /var/www/livego.store -type f -size 0 2>/dev/null | wc -l
echo "=== REMOTE VERSION ==="
cat /var/www/livego.store/version.json
echo "=== REMOTE INDEX ASSET REFS ==="
grep -o 'index-[A-Za-z0-9]*\\.js\\|index-[A-Za-z0-9]*\\.css\\|react-[A-Za-z0-9]*\\.js' /var/www/livego.store/index.html
`;

const b64 = Buffer.from(SCRIPT).toString('base64');

const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); process.exit(1); } }, 90000);

conn.on('ready', () => {
  conn.exec(`echo ${b64} | base64 -d | bash`, (e, stream) => {
    if (e) { console.error(e); clearTimeout(timer); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { done = true; clearTimeout(timer); conn.end(); });
  });
}).on('error', e => { console.error('[SSH] Error:', e.message); clearTimeout(timer); })
   .connect({ host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#', readyTimeout: 30000 });
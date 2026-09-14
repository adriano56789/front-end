const { Client } = require('ssh2');

const SCRIPT = `#!/bin/bash
echo "=== FRONTEND ZERO BYTES ==="
find /var/www/livego.store -type f -size 0 | wc -l
find /var/www/livego.store -type f -size 0 | head -10
echo "=== ASSETS ==="
ls -la /var/www/livego.store/assets/ | awk '{print $5, $9}' | head -25
echo "=== CURL ASSET ==="
curl -sI -k https://localhost/assets/index-Dpl8EjUl.js | head -5
echo "=== VERSION ==="
cat /var/www/livego.store/version.json
echo "=== BACKEND STATUS ==="
docker ps -a --filter "name=app-backend" --format "{{.Names}} {{.Status}}"
docker inspect app-backend --format "restarts={{.RestartCount}}" 2>&1
echo "=== BACKEND LOG TAIL ==="
docker logs --tail 12 app-backend 2>&1
echo "=== BACKEND GIT ==="
cd /app/backend && git status 2>&1 | head -40
cd /app/backend && git log --oneline -5 2>&1
cd /app/backend && git diff --stat 2>&1 | head -20
echo "=== BACKEND GIT STASH ==="
cd /app/backend && git stash list 2>&1
`;

const b64 = Buffer.from(SCRIPT).toString('base64');
const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); try{conn.end();}catch(e){} process.exit(1); } }, 120000);

conn.on('ready', () => {
  conn.exec(`echo ${b64} | base64 -d | bash`, (e, stream) => {
    if (e) { console.error(e); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { done = true; clearTimeout(timer); conn.end(); });
  });
}).on('error', e => { console.error(e); clearTimeout(timer); })
   .connect({ host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#', readyTimeout: 60000 });
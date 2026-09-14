const { Client } = require('ssh2');

const SCRIPT = `#!/bin/bash
echo "=== MONGO PING ==="
docker exec app-mongodb mongosh "mongodb://127.0.0.1:27017/admin?authSource=admin" -u livego_admin -p ce0d61d0277da7031e11c97b66a775f01ab0f0bfbe443108 --quiet --eval 'db.adminCommand({ping:1}).ok' 2>&1
echo "=== MONGO DATABASES ==="
docker exec app-mongodb mongosh "mongodb://127.0.0.1:27017/admin?authSource=admin" -u livego_admin -p ce0d61d0277da7031e11c97b66a775f01ab0f0bfbe443108 --quiet --eval 'db.adminCommand({listDatabases:1}).databases.map(d=>d.name)' 2>&1
echo "=== HOST ASSET SIZE ==="
curl -sI https://localhost/assets/index-Dpl8EjUl.js -k 2>&1 | head -8
echo "=== BACKEND HEALTH ==="
curl -s -o /dev/null -w "%{http_code}" --max-time 6 http://127.0.0.1:3000/ 2>&1
echo ""
echo "=== MONGODB STATE ==="
docker inspect app-mongodb --format "status={{.State.Status}} restartcount={{.RestartCount}}" 2>&1
`;

const b64 = Buffer.from(SCRIPT).toString('base64');
const REMOTE_CMD = `echo ${b64} | base64 -d | bash`;

const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); process.exit(1); } }, 120000);

conn.on('ready', () => {
  console.log('[SSH] OK');
  conn.exec(REMOTE_CMD, (e, stream) => {
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
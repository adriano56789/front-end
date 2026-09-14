const { Client } = require('ssh2');

const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); process.exit(1); } }, 120000);

const CMD = [
  'echo "=== /app/docker-compose.yml ==="',
  'cat /app/docker-compose.yml',
  'echo "=== /app/.env ==="',
  'cat /app/.env',
  'echo "=== /app/frontend/nginx.conf ==="',
  'cat /app/frontend/nginx.conf',
  'echo "=== NETWORKS ==="',
  'docker network ls',
  'echo "=== app-backend NETWORKS ==="',
  'docker inspect app-backend --format "{{json .NetworkSettings.Networks}}"',
  'echo "=== app-mongodb NETWORKS ==="',
  'docker inspect app-mongodb --format "{{json .NetworkSettings.Networks}}"',
  'echo "=== app-backend LINKED ==="',
  'docker inspect app-backend --format "{{json .Config.Env}}" | tr "," "\\n" | grep -i "MONGODB\\|DB_\|MONGO"',
  'echo "=== /root ls ==="',
  'ls -la /root',
].join(' && ');

conn.on('ready', () => {
  console.log('[SSH] OK');
  conn.exec(CMD, (e, stream) => {
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
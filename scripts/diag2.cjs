const { Client } = require('ssh2');

const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); process.exit(1); } }, 60000);

const CMD = [
  'echo "=== LIVEGO-FRONTEND ==="',
  'docker inspect livego-frontend --format "{{.Config.Image}} {{.Mounts}}" 2>&1',
  'echo "=== ALL CONTAINERS ==="',
  'docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"',
  'echo "=== FRONTEND NGINX ==="',
  'docker exec livego-frontend cat /etc/nginx/conf.d/default.conf 2>&1 | head -40',
  'echo "=== INDEX ON SERVER ==="',
  'grep -n "assets" /var/www/livego.store/index.html 2>&1',
  'echo "=== CURL ASSETS ==="',
  'curl -sI http://localhost/assets/index-Dpl8EjUl.js 2>&1 | head -5',
  'echo "=== NETSTAT ==="',
  'ss -tlnp | grep -E "80|443" 2>&1',
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

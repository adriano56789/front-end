const { Client } = require('ssh2');

const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); process.exit(1); } }, 120000);

const CMD = [
  'echo "=== BACKEND STATUS ==="',
  'docker ps -a --filter "name=app-backend" --format "{{.Names}} {{.Status}}"',
  'echo "=== BACKEND RESTART COUNT ==="',
  'docker inspect app-backend --format "{{.RestartCount}} restarts" 2>&1',
  'echo "=== BACKEND LOGS (200 linhas) ==="',
  'docker logs --tail 200 app-backend 2>&1',
  'echo "=== /app DIR ==="',
  'ls -la /app',
  'echo "=== /app/frontend ==="',
  'ls -la /app/frontend 2>&1 | head -30',
  'echo "=== /app/nginx ==="',
  'ls -la /app/nginx 2>&1 | head -30',
  'echo "=== /root/srs ==="',
  'ls -la /root/srs 2>&1 | head -20',
  'echo "=== HOST NGINX (porta 80/443) ==="',
  'nginx -v 2>&1; systemctl status nginx --no-pager 2>&1 | head -15',
  'echo "=== HOST NGINX SITES ==="',
  'ls -la /etc/nginx/sites-enabled/ 2>&1 | head -20',
  'echo "=== HOST NGINX CONF SERVERS ==="',
  'grep -rn "server_name\\|root " /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>&1 | head -40',
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
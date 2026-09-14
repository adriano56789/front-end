const { Client } = require('ssh2');

const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); process.exit(1); } }, 120000);

const CMD = [
  'echo "=== MONGODB FULL NETWORK ==="',
  'docker inspect app-mongodb --format "IP:{{range .NetworkSettings.Networks}}{{.IPAddress}} net={{.NetworkID}}{{end}} Mode:{{.HostConfig.NetworkMode}}" 2>&1',
  'echo "=== BACKEND FULL NETWORK ==="',
  'docker inspect app-backend --format "IP:{{range .NetworkSettings.Networks}}{{.IPAddress}} net={{.NetworkID}}{{end}} Mode:{{.HostConfig.NetworkMode}}" 2>&1',
  'echo "=== NETWORK CONTAINERS app_livego-net ==="',
  'docker network inspect app_livego-net --format "{{range .Containers}}{{.Name}} {{.IPv4Address}}{{end}}" 2>&1',
  'echo "=== NETWORK CONTAINERS livego-net ==="',
  'docker network inspect livego-net --format "{{range .Containers}}{{.Name}} {{.IPv4Address}}{{end}}" 2>&1',
  'echo "=== NETWORK CONTAINERS backend_livego-net ==="',
  'docker network inspect backend_livego-net --format "{{range .Containers}}{{.Name}} {{.IPv4Address}}{{end}}" 2>&1',
  'echo "=== NETWORK CONTAINERS app_default ==="',
  'docker network inspect app_default --format "{{range .Containers}}{{.Name}} {{.IPv4Address}}{{end}}" 2>&1',
  'echo "=== REDIS NETWORKS ==="',
  'docker inspect app-redis --format "{{json .NetworkSettings.Networks}}" 2>&1',
  'echo "=== SYSTEMD NGINX CONF livego ==="',
  'cat /etc/nginx/sites-enabled/livego',
  'echo "=== SYSTEMD NGINX CONF api ==="',
  'cat /etc/nginx/sites-enabled/api-livego-store',
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
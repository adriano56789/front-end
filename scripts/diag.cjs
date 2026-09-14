const { Client } = require('ssh2');

const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); process.exit(1); } }, 60000);

const CMD = [
  'echo "=== DOCKER ==="',
  'docker ps --format "{{.Names}} {{.Status}}"',
  'echo "=== WWW ROOT ==="',
  'ls -la /var/www/livego.store/',
  'echo "=== WWW ASSETS ==="',
  'ls -la /var/www/livego.store/assets/ 2>&1',
  'echo "=== INDEX.HTML HEAD ==="',
  'head -10 /var/www/livego.store/index.html 2>&1',
  'echo "=== NGINX RUNNING ==="',
  'docker ps --filter "name=nginx" --format "{{.Names}} {{.Status}}"',
  'echo "=== NGINX TEST ==="',
  'docker exec $(docker ps -q --filter "name=nginx" | head -1) nginx -t 2>&1',
  'echo "=== CURL LOCAL ==="',
  'curl -sI http://localhost/ 2>&1 | head -5',
  'echo "=== CURL FAVICON ==="',
  'curl -sI http://localhost/favicon.ico 2>&1 | head -5',
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

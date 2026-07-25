const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  const cmd = [
    'echo "=== FRONTEND DEPLOY DIR ==="',
    'ls -la /root/frontend-deploy/ 2>/dev/null | head -20',
    'cat /root/frontend-deploy/docker-compose.yml 2>/dev/null',
    'echo "=== FRONTEND SRC DIR ==="',
    'ls -la /root/frontend-src/ 2>/dev/null | head -20',
    'echo "=== NGINX ON HOST ==="',
    'ls /etc/nginx/sites-enabled/ 2>/dev/null || echo "no sites-enabled"',
    'ls /etc/nginx/conf.d/ 2>/dev/null | head -10',
    'cat /etc/nginx/conf.d/default.conf 2>/dev/null | head -30 || echo "no default.conf"',
    'nginx -t 2>&1 | head -5 || echo "no nginx on host"',
    'echo "=== WHERE IS FRONTEND HTML ==="',
    'ls /usr/share/nginx/html/ 2>/dev/null | head -10 || echo "no /usr/share/nginx/html"',
    'ls /var/www/ 2>/dev/null | head -10 || echo "no /var/www"',
    'echo "=== DONE ==="'
  ].join(' && ');

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error('exec error:', err); conn.end(); return; }
    let out = '';
    stream.stdout.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += 'STDERR: ' + d.toString(); });
    stream.on('close', () => {
      console.log(out);
      conn.end();
      process.exit(0);
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH ERROR:', err.message);
  process.exit(1);
});

conn.connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  readyTimeout: 15000,
  tryKeyboard: true
});

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['MshrUfZrh09hWr#']);
});

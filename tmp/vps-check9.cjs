const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  const cmd = [
    'echo "=== NGINX LIVEGO STORE CONF ==="',
    'cat /etc/nginx/conf.d/livego 2>/dev/null | head -80',
    'echo "=== NGINX LIVEGO-STORE CONF ==="',
    'cat /etc/nginx/sites-enabled/livego* 2>/dev/null | head -80 || echo "none"',
    'echo "=== NGINX API CONFD ==="',
    'cat /etc/nginx/conf.d/api-livego-store 2>/dev/null | head -80',
    'echo "=== WHERE DIST IS SERVED FROM ==="',
    'grep -r "root\\|try_files\\|index" /etc/nginx/conf.d/livego 2>/dev/null | head -20',
    'grep -r "root\\|try_files\\|index" /etc/nginx/sites-enabled/livego* 2>/dev/null | head -20',
    'echo "=== FRONTEND DIST DIR ==="',
    'ls /usr/share/nginx/html/livego.store/ 2>/dev/null | head -20',
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

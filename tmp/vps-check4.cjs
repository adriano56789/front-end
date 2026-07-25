const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  const cmd = [
    'echo "=== TURN ROUTES CODE ==="',
    'docker exec app-backend cat /app/dist/routes/turnRoutes.js 2>/dev/null | head -80',
    'echo "=== TURN ROUTES LINE COUNT ==="',
    'docker exec app-backend wc -l /app/dist/routes/turnRoutes.js 2>/dev/null',
    'echo "=== MAIN APP ROUTER TURN ==="',
    'docker exec app-backend grep -n "turn" /app/dist/app.js 2>/dev/null || docker exec app-backend grep -n "turn" /app/dist/server.js 2>/dev/null || echo "checking index"',
    'docker exec app-backend grep -n "turn" /app/dist/index.js 2>/dev/null || echo "no index.js match"',
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

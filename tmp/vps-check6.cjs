const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  const cmd = [
    'echo "=== STREAM ID MAPPER ==="',
    'docker exec app-backend cat /app/dist/services/StreamIdMapper.js 2>/dev/null | head -80',
    'echo "=== BACKEND VIDEO STREAM ROUTES ==="',
    'docker exec app-backend cat /app/dist/routes/videoStreamRoutes.js 2>/dev/null | head -100',
    'echo "=== CORS CONFIG ==="',
    'docker exec app-backend grep -n "CORS" /app/dist/config/env.js 2>/dev/null | head -20',
    'echo "=== CORS_ORIGIN VALUE ==="',
    'docker exec app-backend node -e "const e=require(\"/app/dist/config/env\");console.log(e.ENV.CORS_ORIGIN)" 2>/dev/null',
    'echo "=== TURN LOGS MOBILE ==="',
    'docker logs app-backend --tail=500 2>&1 | grep -i "TURN-SECURITY" | tail -20',
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

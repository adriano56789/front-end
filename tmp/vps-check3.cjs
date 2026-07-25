const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  const cmd = [
    'echo "=== TURN ENDPOINT CHECK ==="',
    'docker exec app-backend find /app/dist -name "*.js" -exec grep -l "turn" {} \\; 2>/dev/null | head -10',
    'echo "=== ICE-SERVERS ROUTE ==="',
    'docker exec app-backend find /app/dist -name "*.js" -exec grep -l "ice-servers" {} \\; 2>/dev/null | head -10',
    'echo "=== TURN IN ROUTES ==="',
    'docker exec app-backend sh -c "grep -rl turn /app/dist/routes/ 2>/dev/null" || echo "no turn routes"',
    'echo "=== BACKEND LOGS TURN ==="',
    'docker logs app-backend --tail=200 2>&1 | grep -i turn | tail -30',
    'echo "=== BACKEND LOGS 401 ==="',
    'docker logs app-backend --tail=200 2>&1 | grep -i "401\\|unauthorized\\|auth" | tail -20',
    'echo "=== TEST ICE-SERVERS LOCAL ==="',
    'curl -s http://localhost:3000/api/rtc/ice-servers 2>&1 | head -20',
    'echo "=== TEST TURN CREDENTIALS LOCAL ==="',
    'curl -s -X POST http://localhost:3000/api/turn/credentials -H "Content-Type: application/json" -d \'{"userId":"test","streamId":"test"}\' 2>&1 | head -20',
    'echo "=== COTURN STATUS ==="',
    'docker ps | grep coturn',
    'echo "=== COTURN LOGS ==="',
    'docker logs app-coturn --tail=30 2>&1 | tail -20',
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

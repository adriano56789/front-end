const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  const cmd = [
    'echo "=== SRS CONTAINER INSPECT ==="',
    'docker exec app-srs cat /usr/local/srs/conf/srs.conf 2>/dev/null || echo "NO CONF"',
    'echo "=== SRS HLS DIR ==="',
    'docker exec app-srs ls /usr/local/srs/objs/nginx/html/live/ 2>/dev/null || echo "NO HLS DIR"',
    'echo "=== SRS PROCESSES ==="',
    'docker exec app-srs ps aux 2>/dev/null | grep srs || echo "no ps"',
    'echo "=== SRS INTERNAL HLS ==="',
    'curl -s http://localhost:8080/live/ 2>/dev/null | head -50 || echo "no curl on 8080"',
    'echo "=== TEST HLS URL ==="',
    'curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:8080/live/stream_6494748.m3u8 2>/dev/null',
    'echo ""',
    'echo "=== TEST via HTTPS ==="',
    'curl -sk -o /dev/null -w "HTTP %{http_code}" https://livego.store/srs/live/stream_6494748.m3u8 2>/dev/null',
    'echo ""',
    'echo "=== TEST via API ==="',
    'curl -sk -o /dev/null -w "HTTP %{http_code}" https://livego.store/api/video/http/live/stream_6494748.m3u8 2>/dev/null',
    'echo ""',
    'echo "=== FIND SRS CONF FILES ==="',
    'docker exec app-srs find /usr/local/srs/conf -name "*.conf" 2>/dev/null',
    'docker exec app-srs find / -name "srs.conf" 2>/dev/null | head -5',
    'echo "=== SRS VHOST ==="',
    'docker exec app-srs cat /usr/local/srs/conf/srs.conf 2>/dev/null | grep -A 30 "vhost"',
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

const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  const cmd = 'echo "=== SRS CONFIG ===" && ls -la /root/srs/ && ls -la /root/srs/conf/ && echo "=== SRS CONF ===" && cat /root/srs/conf/srs.conf 2>/dev/null && echo "=== NGINX ===" && ls -la /app/nginx/ && echo "=== NGINX CONF ===" && cat /app/nginx/nginx.conf 2>/dev/null && echo "=== DOCKER ===" && docker ps --format "table {{.Names}} {{.Ports}} {{.Status}}" && echo "=== SRS HLS ===" && find /usr/local/srs/objs/nginx/html -name "*.m3u8" 2>/dev/null | head -10 && ls -la /usr/local/srs/objs/nginx/html/live/ 2>/dev/null | head -20 && echo "=== DONE ==="';
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', () => conn.end());
    stream.stdout.on('data', (data) => process.stdout.write(data));
    stream.stderr.on('data', (data) => process.stderr.write(data));
  });
});

conn.on('error', (err) => {
  console.error('SSH ERROR:', err.message);
});

conn.connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  password: 'MshrUfZrh09hWr#'
});

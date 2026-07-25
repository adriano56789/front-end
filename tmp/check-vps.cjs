const { Client } = require('ssh2');

const conn = new Client();

const cmd = `
echo "=== DOCKER PS ==="
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
echo "=== SRS CONF ==="
cat /root/srs/conf/srs.conf 2>/dev/null || echo "no srs.conf"
echo "=== SRS HLS PATH ==="
ls -la /usr/local/srs/objs/nginx/html/live/ 2>/dev/null || echo "no hls dir"
echo "=== LIVEKIT ==="
ls -la /root/livekit/ 2>/dev/null
echo "=== BACKEND ==="
ls -la /app/backend/ 2>/dev/null | head -20
echo "=== NGINX CONF (deployed) ==="
docker exec nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null | head -200 || cat /app/nginx/nginx.conf 2>/dev/null | head -200
echo "=== ENV FILES ==="
cat /app/backend/.env 2>/dev/null | grep -v PASSWORD | grep -v SECRET | grep -v KEY | head -30
echo "=== DONE ==="
`.trim();

conn.on('ready', () => {
  console.log('SSH CONNECTED!');
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '';
    let errOut = '';
    stream.stdout.on('data', (d) => out += d.toString());
    stream.stderr.on('data', (d) => errOut += d.toString());
    stream.on('close', () => {
      console.log(out);
      if (errOut) console.error('STDERR:', errOut);
      conn.end();
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH ERROR:', err.message);
});

conn.connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  password: 'MshrUfZrh09hWr#',
  readyTimeout: 20000,
  algorithms: {
    kex: [
      'ecdh-sha2-nistp256',
      'ecdh-sha2-nistp384',
      'ecdh-sha2-nistp521',
      'diffie-hellman-group-exchange-sha256',
      'diffie-hellman-group14-sha256',
      'diffie-hellman-group14-sha1'
    ]
  }
});

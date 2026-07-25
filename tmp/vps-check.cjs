const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('=== SSH CONNECTED ===');
  const cmd = [
    'echo "=== DOCKER PS ==="',
    'docker ps --format "table {{.Names}}\\t{{.Ports}}\\t{{.Status}}"',
    'echo "=== SRS CONF ==="',
    'cat /root/srs/conf/srs.conf 2>/dev/null || echo "NO_SRS_CONF"',
    'echo "=== SRS HLS FILES ==="',
    'docker exec srs ls /usr/local/srs/objs/nginx/html/live/ 2>/dev/null || echo "no_srs_hls_dir"',
    'echo "=== NGINX DEPLOYED ==="',
    'cat /app/nginx/nginx.conf 2>/dev/null || docker exec nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null || echo "NO_NGINX"',
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
  tryKeyboard: true,
  algorithms: {
    kex: [
      'curve25519-sha256',
      'curve25519-sha256@libssh.org',
      'ecdh-sha2-nistp256',
      'ecdh-sha2-nistp384',
      'ecdh-sha2-nistp521',
      'diffie-hellman-group-exchange-sha256',
      'diffie-hellman-group14-sha256',
      'diffie-hellman-group14-sha1'
    ]
  }
});

// Handle keyboard-interactive auth
conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  console.log('Keyboard-interactive auth:', name, prompts);
  finish(['MshrUfZrh09hWr#']);
});

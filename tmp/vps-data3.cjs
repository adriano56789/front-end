const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  const cmd = [
    'echo "=== MONGO VERSION ==="',
    'docker exec app-mongodb mongosh --version 2>/dev/null',
    'echo "=== DB LIST ==="',
    'docker exec app-mongodb mongosh --eval "db.adminCommand({listDatabases:1})" --quiet 2>/dev/null',
    'echo "=== COLLECTIONS ==="',
    'docker exec app-mongodb mongosh --eval "db = db.getSiblingDB(db.getName()); db.getCollectionNames()" --quiet 2>/dev/null',
    'echo "=== ENV ==="',
    'docker exec app-backend cat .env 2>/dev/null',
    'echo "=== BACKEND LOGS STREAMS ==="',
    'docker logs app-backend --tail 300 2>&1 | grep -iE "stream|streamId|streamKey|stream_" | tail -30',
    'echo "=== SRS ACTIVE STREAMS ==="',
    'curl -s http://localhost:1985/api/v1/streams/ 2>/dev/null'
  ].join(' && echo "=== NEXT ===" && ');

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
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

conn.on('error', (err) => { console.error('SSH ERROR:', err.message); process.exit(1); });
conn.connect({ host: '2.25.192.154', port: 22, username: 'root', readyTimeout: 15000, tryKeyboard: true });
conn.on('keyboard-interactive', (n, i, il, p, f) => { f(['MshrUfZrh09hWr#']); });

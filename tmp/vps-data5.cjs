const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  const cmd = `echo "=== COLLECTIONS ===" && docker exec app-mongodb mongosh "api" --eval "db.getCollectionNames()" --quiet && echo "=== STREAMS ===" && docker exec app-mongodb mongosh "api" --eval "JSON.stringify(db.streams.find({}).sort({_id:-1}).limit(3).toArray())" --quiet && echo "=== BACKEND ENV ===" && docker exec app-backend env | grep -iE "MONGO|DB_|DATABASE|JWT|SECRET" | head -20 && echo "=== BACKEND LOGS ===" && docker logs app-backend --tail 1000 2>&1 | grep -iE "streamId|streamKey|stream_|publishStream|startLive|\.m3u8|srs" | tail -30 && echo "=== DONE ==="`;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '';
    stream.stdout.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += 'STDERR: ' + d.toString(); });
    stream.on('close', () => { console.log(out); conn.end(); process.exit(0); });
  });
});

conn.on('error', (err) => { console.error('SSH ERROR:', err.message); process.exit(1); });
conn.connect({ host: '2.25.192.154', port: 22, username: 'root', readyTimeout: 15000, tryKeyboard: true });
conn.on('keyboard-interactive', (n, i, il, p, f) => { f(['MshrUfZrh09hWr#']); });

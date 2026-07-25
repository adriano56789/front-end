const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  const cmd = [
    'echo "=== COLLECTIONS ==="',
    'docker exec app-mongodb mongosh --eval "db = db.getSiblingDB(\"api\"); db.getCollectionNames()" --quiet 2>/dev/null',
    'echo "=== SEP ==="',
    'docker exec app-mongodb mongosh --eval "db = db.getSiblingDB(\"api\"); JSON.stringify(db.streams.find({}).sort({_id:-1}).limit(3).toArray(), null, 2)" --quiet 2>/dev/null',
    'echo "=== SEP ==="',
    'docker exec app-mongodb mongosh --eval "db = db.getSiblingDB(\"api\"); JSON.stringify(db.users.find({}).sort({_id:-1}).limit(2).toArray(), null, 2)" --quiet 2>/dev/null',
    'echo "=== SEP ==="',
    'docker exec app-mongodb mongosh --eval "db = db.getSiblingDB(\"api\"); JSON.stringify(db.live_sessions.find({}).sort({_id:-1}).limit(2).toArray(), null, 2)" --quiet 2>/dev/null',
    'echo "=== SEP ==="',
    'docker exec app-mongodb mongosh --eval "db = db.getSiblingDB(\"api\"); JSON.stringify(db.streamers.find({}).sort({_id:-1}).limit(2).toArray(), null, 2)" --quiet 2>/dev/null',
    'echo "=== SEP ==="',
    'docker logs app-backend --tail 500 2>&1 | grep -iE "stream_key|streamKey|publishStream|startLive|stream_" | tail -30'
  ].join(' && echo "=== SEP ===" && ');

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

const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  const cmd = `echo "=== STREAMERS ===" && docker exec app-mongodb mongosh "api" --eval "JSON.stringify(db.streamers.find({isLive:true}).limit(5).toArray())" --quiet && echo "=== SEP ===" && docker exec app-mongodb mongosh "api" --eval "JSON.stringify(db.streamers.find({}).sort({_id:-1}).limit(3).toArray())" --quiet && echo "=== SEP ===" && echo "=== STREAMKEYS ===" && docker exec app-mongodb mongosh "api" --eval "JSON.stringify(db.streamkeys.find({}).sort({_id:-1}).limit(5).toArray())" --quiet && echo "=== SEP ===" && echo "=== PUBLISHES ===" && docker exec app-mongodb mongosh "api" --eval "JSON.stringify(db.publishes.find({}).sort({_id:-1}).limit(5).toArray())" --quiet && echo "=== SEP ===" && echo "=== STREAMSESSIONS ===" && docker exec app-mongodb mongosh "api" --eval "JSON.stringify(db.streamsessions.find({}).sort({_id:-1}).limit(3).toArray())" --quiet && echo "=== SEP ===" && echo "=== USERS with streamKey ===" && docker exec app-mongodb mongosh "api" --eval "JSON.stringify(db.users.find({streamKey:{\\$exists:true}}).limit(3).toArray())" --quiet && echo "=== SEP ===" && echo "=== LATEST USERS ===" && docker exec app-mongodb mongosh "api" --eval "JSON.stringify(db.users.find({}).sort({_id:-1}).limit(2).toArray())" --quiet && echo "=== DONE ==="`;

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

const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  const cmd = [
    'echo "=== MONGO DBS ==="',
    'docker exec app-mongodb mongosh --quiet --eval "db.adminCommand({listDatabases:1}).databases.map(d=>d.name).join(\", \")" 2>/dev/null || docker exec app-mongodb mongo --quiet --eval "db.adminCommand({listDatabases:1}).databases.map(d=>d.name).join(\", \")" 2>/dev/null',
    'echo "=== SEPARATOR ==="',
    // Check all collections in livego database
    'docker exec app-mongodb mongosh --quiet livego --eval "db.getCollectionNames().join(\", \")" 2>/dev/null',
    'echo "=== SEPARATOR ==="',
    // Check streams collection
    'docker exec app-mongodb mongosh --quiet livego --eval "JSON.stringify(db.streams.find({}).sort({_id:-1}).limit(3).toArray(), null, 2)" 2>/dev/null',
    'echo "=== SEPARATOR ==="',
    // Check users collection for streamers
    'docker exec app-mongodb mongosh --quiet livego --eval "JSON.stringify(db.users.find({isLive:true}).limit(3).toArray(), null, 2)" 2>/dev/null',
    'echo "=== SEPARATOR ==="',
    // Check live_sessions
    'docker exec app-mongodb mongosh --quiet livego --eval "JSON.stringify(db.live_sessions.find({}).sort({_id:-1}).limit(3).toArray(), null, 2)" 2>/dev/null',
    'echo "=== SEPARATOR ==="',
    // Backend .env for database name
    'docker exec app-backend cat .env 2>/dev/null | grep -i "MONGO\\|DB\\|DATABASE" | head -10',
    'echo "=== SEPARATOR ==="',
    // Backend logs for stream keys
    'docker logs app-backend --tail 200 2>&1 | grep -iE "stream_key|streamKey|stream_6|publish|whip" | tail -20'
  ].join(' && echo "=== SEP ===" && ');

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

const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  const cmd = [
    // Check MongoDB for real streams
    'docker exec app-mongodb mongosh --quiet --eval "db.streams.find().sort({_id:-1}).limit(5).toArray()" livego 2>/dev/null || docker exec app-mongodb mongo --quiet --eval "db.streams.find().sort({_id:-1}).limit(5).toArray()" livego 2>/dev/null',
    'echo "=== SEPARATOR ==="',
    // Check backend logs for recent stream activity
    'docker logs app-backend --tail 50 2>&1 | grep -i "stream\\|hls\\|srs" | tail -20',
    'echo "=== SEPARATOR ==="',
    // Check what stream keys are being published
    'docker logs app-srs --tail 100 2>&1 | grep -i "publish\\|stream\\|hls" | tail -20',
    'echo "=== SEPARATOR ==="',
    // Try to find active streams via SRS API
    'curl -s http://localhost:1985/api/v1/streams 2>/dev/null | head -200',
    'echo "=== SEPARATOR ==="',
    // Check the backend env for MongoDB URI
    'docker exec app-backend cat .env 2>/dev/null | grep -i MONGO'
  ].join(' && echo "=== SEPARATOR ===" && ');

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

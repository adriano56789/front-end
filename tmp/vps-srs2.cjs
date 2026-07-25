const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');

  const cmd = [
    'echo "=== SRS VOLUME MOUNTS ==="',
    'docker inspect app-srs --format "{{json .Mounts}}" 2>/dev/null | python3 -m json.tool 2>/dev/null || docker inspect app-srs --format "{{json .Mounts}}"',
    'echo "=== SRS RUN CMD ==="',
    'docker inspect app-srs --format "{{json .Config.Cmd}}"',
    'echo "=== DOCKER COMPOSE FILE ==="',
    'cat /root/srs/trunk/docker-compose.yml 2>/dev/null | head -60',
    'echo "=== CHECK IF SRS CONF IS BIND MOUNT ==="',
    'docker inspect app-srs --format "{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Mode}}){{println}}{{end}}"',
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

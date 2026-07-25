const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');

  const cmd = [
    'echo "=== SSHD CONFIG ==="',
    'grep -E "PasswordAuthentication|PubkeyAuthentication|ChallengeResponse|UsePAM" /etc/ssh/sshd_config | grep -v "^#"',
    'echo "=== SSH AUTH METHODS ==="',
    'ssh -o PreferredAuthentications=none -o ConnectTimeout=3 2>&1 localhost || true',
    'echo "=== CHECK PUBKEY FILE ==="',
    'ls -la ~/.ssh/authorized_keys 2>/dev/null || echo "no authorized_keys"',
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

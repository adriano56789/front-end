const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  const cmd = [
    'echo "=== FAIL2BAN ==="',
    'fail2ban-client status sshd 2>/dev/null || echo "fail2ban not running"',
    'echo "=== BANNED IPs ==="',
    'iptables -L INPUT -n 2>/dev/null | grep -i "DROP\\|REJECT\\|fail2ban" | head -20 || echo "no iptables rules"',
    'echo "=== SSH AUTH LOG ==="',
    'grep "168.194.106.216" /var/log/auth.log 2>/dev/null | tail -10 || echo "no matches in auth.log"',
    'grep "168.194.106.216" /var/log/secure 2>/dev/null | tail -10 || echo "no matches in secure"',
    'echo "=== RECENT FAILED ==="',
    'journalctl -u ssh --no-pager -n 20 2>/dev/null | grep -i "fail\\|invalid\\|refused" | tail -10 || echo "no journal"',
    'echo "=== SSHD CONFIG FULL ==="',
    'grep -v "^#" /etc/ssh/sshd_config | grep -v "^$" | head -30',
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

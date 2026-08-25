const { Client } = require('ssh2');
const conn = new Client();
const PASSWORD = 'MshrUfZrh09hWr#';
conn.on('keyboard-interactive', (n,i,l,p,f) => f([PASSWORD]));
conn.on('ready', () => {
  const cmds = [
    'echo "=== Docker Containers ==="',
    'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1',
    'echo "=== Backend Health ==="',
    'curl -sk https://livego.store/api/health 2>&1 | head -5',
    'echo "=== Nginx Status ==="',
    'systemctl is-active nginx 2>&1',
    'echo "=== Backend dir ==="',
    'ls -la /app/backend/ 2>&1 | head -10',
    'echo "=== Docker Compose ==="',
    'cd /app && docker compose ps 2>&1',
  ];
  conn.exec(cmds.join(' ; '), (err, stream) => {
    let out = '';
    stream.on('close', () => { console.log(out); conn.end(); process.exit(0); });
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += d.toString());
  });
});
conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASSWORD,tryKeyboard:true,readyTimeout:30000});

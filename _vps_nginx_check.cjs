const { Client } = require('ssh2');
const conn = new Client();
const PASSWORD = 'MshrUfZrh09hWr#';
conn.on('keyboard-interactive', (n,i,l,p,f) => f([PASSWORD]));
conn.on('ready', () => {
  const cmds = [
    'echo "=== nginx conf ==="',
    'cat /etc/nginx/conf.d/*.conf 2>/dev/null || cat /etc/nginx/nginx.conf 2>/dev/null',
    'echo "=== livego.store check ==="',
    'ls -la /var/www/livego.store/index.html 2>&1',
    'echo "=== version.json ==="',
    'cat /var/www/livego.store/version.json 2>&1',
    'echo "=== docker-compose.yml ==="',
    'cat /app/docker-compose.yml 2>&1 | head -60',
  ];
  conn.exec(cmds.join(' ; '), (err, stream) => {
    let out = '';
    stream.on('close', () => { console.log(out); conn.end(); process.exit(0); });
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += d.toString());
  });
});
conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASSWORD,tryKeyboard:true,readyTimeout:30000});

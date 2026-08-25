const { Client } = require('ssh2');
const conn = new Client();
const PASSWORD = 'MshrUfZrh09hWr#';
conn.on('keyboard-interactive', (n,i,l,p,f) => f([PASSWORD]));
conn.on('ready', () => {
  const cmds = [
    'echo "=== All nginx configs ==="',
    'ls -la /etc/nginx/conf.d/',
    'echo "=== livego-frontend container nginx conf ==="',
    'docker exec livego-frontend cat /etc/nginx/conf.d/default.conf 2>&1',
    'echo "=== main nginx.conf ==="',
    'cat /etc/nginx/nginx.conf 2>&1',
    'echo "=== LiveGo site check ==="',
    'curl -skI https://livego.store 2>&1 | head -10',
    'echo "=== Backend git status ==="',
    'cd /app/backend && git log --oneline -3 2>&1',
  ];
  conn.exec(cmds.join(' ; '), (err, stream) => {
    let out = '';
    stream.on('close', () => { console.log(out); conn.end(); process.exit(0); });
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += d.toString());
  });
});
conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASSWORD,tryKeyboard:true,readyTimeout:30000});

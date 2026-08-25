const { Client } = require('ssh2');
const conn = new Client();
const PASSWORD = 'MshrUfZrh09hWr#';
conn.on('keyboard-interactive', (n,i,l,p,f) => f([PASSWORD]));
conn.on('ready', () => {
  const cmds = [
    'echo "=== livego-frontend volume mounts ==="',
    'docker inspect livego-frontend --format="{{json .Mounts}}" 2>&1',
    'echo "=== sites-enabled ==="',
    'ls -la /etc/nginx/sites-enabled/ 2>&1',
    'echo "=== livego backend latest ==="',
    'cd /app/backend && git status --short 2>&1',
    'echo "=== container nginx restart check ==="',
    'docker exec livego-frontend ls -la /usr/share/nginx/html/version.json 2>&1',
    'echo "=== host nginx config for livego.store ==="',
    'cat /etc/nginx/sites-enabled/* 2>&1 | head -80',
  ];
  conn.exec(cmds.join(' ; '), (err, stream) => {
    let out = '';
    stream.on('close', () => { console.log(out); conn.end(); process.exit(0); });
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += d.toString());
  });
});
conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASSWORD,tryKeyboard:true,readyTimeout:30000});

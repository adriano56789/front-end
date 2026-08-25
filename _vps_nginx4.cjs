const { Client } = require('ssh2');
const conn = new Client();
const PASSWORD = 'MshrUfZrh09hWr#';
conn.on('keyboard-interactive', (n,i,l,p,f) => f([PASSWORD]));
conn.on('ready', () => {
  const cmds = [
    'echo "=== livego site ==="',
    'cat /etc/nginx/sites-enabled/livego 2>&1',
    'echo "=== socket.io test ==="',
    'curl -skI https://livego.store/socket.io/ 2>&1 | head -5',
    'echo "=== API health test ==="',
    'curl -sk https://livego.store/api/health 2>&1',
  ];
  conn.exec(cmds.join(' ; '), (err, stream) => {
    let out = '';
    stream.on('close', () => { console.log(out); conn.end(); process.exit(0); });
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += d.toString());
  });
});
conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASSWORD,tryKeyboard:true,readyTimeout:30000});

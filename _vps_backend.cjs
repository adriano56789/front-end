const { Client } = require('ssh2');
const conn = new Client();
const PASSWORD = 'MshrUfZrh09hWr#';
conn.on('keyboard-interactive', (n,i,l,p,f) => f([PASSWORD]));
conn.on('ready', () => {
  const cmds = [
    'echo "=== Backend Docker image age ==="',
    'docker inspect app-backend --format "{{.Created}}" 2>&1',
    'echo "=== Backend container RestartCount ==="',
    'docker inspect app-backend --format "{{.RestartCount}}" 2>&1',
    'echo "=== docker-compose.yml (backend section) ==="',
    'cd /app && cat docker-compose.yml 2>&1 | sed -n "/backend:/,/^  [a-z]/p"',
    'echo "=== Call invitation routes check ==="',
    'curl -sk https://livego.store/api/call-invitation/active/test 2>&1 | head -3',
    'echo "=== Backend port test ==="',
    'curl -sk http://127.0.0.1:3000/api/health 2>&1',
  ];
  conn.exec(cmds.join(' ; '), (err, stream) => {
    let out = '';
    stream.on('close', () => { console.log(out); conn.end(); process.exit(0); });
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += d.toString());
  });
});
conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASSWORD,tryKeyboard:true,readyTimeout:30000});

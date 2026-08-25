const { Client } = require('ssh2');
const c = new Client();
const PASS = 'MshrUfZrh09hWr#';

c.on('ready', () => {
  c.sftp((err, sftp) => {
    if (err) return console.log('SFTP ERR', err.message);
    sftp.fastPut('C:/Users/adria/Desktop/front-end/tmp-test-push.js', '/tmp/test-push.js', (e1) => {
      if (e1) return console.log('PUT ERR', e1.message);
      const cmd = 'docker cp /tmp/test-push.js app-backend:/tmp/test-push.js && docker exec app-backend node /tmp/test-push.js';
      c.exec(cmd, (e2, s2) => {
        if (e2) return console.log('EXEC ERR', e2.message);
        let o = '';
        s2.on('data', d => o += d);
        s2.stderr.on('data', d => o += d);
        s2.on('close', () => { console.log(o); c.end(); });
      });
    });
  });
}).connect({ host: '2.25.192.154', port: 22, username: 'root', tryKeyboard: true, readyTimeout: 60000 })
  .on('keyboard-interactive', (n, i, il, p, f) => f(p.map(() => PASS)));
setTimeout(() => process.exit(0), 90000);

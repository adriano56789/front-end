const { Client } = require('ssh2');
const fs = require('fs');
const c = new Client();
const PASS = 'MshrUfZrh09hWr#';

c.on('ready', () => {
  c.sftp((err, sftp) => {
    if (err) return console.log('SFTP ERR', err.message);
    let done = 0;
    const finish = () => {
      // rebuild forçado
      const cmd = 'cd /app && docker compose build backend 2>&1 | tail -3 && docker compose up -d backend 2>&1 | tail -2';
      c.exec(cmd, (e3, s3) => {
        if (e3) return console.log('EXEC ERR', e3.message);
        let o = '';
        s3.on('data', d => o += d);
        s3.stderr.on('data', d => o += d);
        s3.on('close', (code) => { console.log('BUILD/UP (code ' + code + '):'); console.log(o.trim()); c.end(); });
      });
    };
    sftp.fastPut('C:/Users/adria/Desktop/backend/package.json', '/app/backend/package.json', (e1) => {
      if (e1) return console.log('PUT pkg ERR', e1.message);
      done++;
      if (done === 2) finish();
    });
    sftp.fastPut('C:/Users/adria/Desktop/backend/package-lock.json', '/app/backend/package-lock.json', (e2) => {
      if (e2) { console.log('PUT lock ERR (seguindo sem ele):', e2.message); done++; if (done === 2) finish(); return; }
      done++;
      if (done === 2) finish();
    });
  });
}).connect({ host: '2.25.192.154', port: 22, username: 'root', tryKeyboard: true, readyTimeout: 40000 })
  .on('keyboard-interactive', (n, i, il, p, f) => f(p.map(() => PASS)));
setTimeout(() => process.exit(0), 590000);

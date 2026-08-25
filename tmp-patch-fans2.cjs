const { Client } = require('ssh2');

// v3: remove a janela de tempo do escopo fans (sem escapes ambíguos de $)
const innerScript = `const fs = require('fs');
const p = '/app/dist/routes/metadataRoutes.js';
let s = fs.readFileSync(p, 'utf8');
const D = String.fromCharCode(36);
const oldM = '{ ' + D + 'match: { toUserId: qTarget, createdAt: { ' + D + 'gte: since } } }';
const newM = '{ ' + D + 'match: { toUserId: qTarget } }';
if (s.indexOf(newM) !== -1) { console.log('ALREADY_V3'); process.exit(0); }
if (s.indexOf(oldM) === -1) { console.log('MATCH_LINE_NOT_FOUND'); process.exit(1); }
fs.copyFileSync(p, p + '.bak_fans_v3');
s = s.split(oldM).join(newM);
fs.writeFileSync(p, s);
console.log('PATCH_FANS_V3_OK');
`;

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP_ERR', err.message); return conn.end(); }
    const stream = sftp.createWriteStream('/tmp/inner-fans3.cjs');
    stream.on('close', () => {
      const steps = [
        'docker cp /tmp/inner-fans3.cjs app-backend:/tmp/inner-fans3.cjs',
        'docker exec app-backend node /tmp/inner-fans3.cjs',
        'docker restart app-backend',
      ];
      let i = 0;
      const runNext = () => {
        if (i >= steps.length) return conn.end();
        const cmd = steps[i]; i++;
        conn.exec(cmd, (e, s2) => {
          let out = '';
          s2.on('close', (code) => { console.log('>>', cmd, '=> CODE', code); if (out.trim()) console.log(out.trim()); runNext(); })
            .on('data', d => out += d.toString())
            .stderr.on('data', d => out += d.toString());
        });
      };
      runNext();
    });
    stream.end(innerScript);
  });
}).connect({
  host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#',
  tryKeyboard: true, readyTimeout: 45000,
});
conn.on('keyboard-interactive', (_, __, ___, ____, finish) => finish([conn.config.password]));

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const DIST = path.join(__dirname, 'dist');
const REMOTE = '/var/www/livego.store';

const conn = new Client();

function runCmd(cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.stdout.on('data', (d) => { out += d.toString(); });
      stream.stderr.on('data', (d) => { out += d.toString(); });
      stream.on('close', (code) => resolve({ out, code }));
    });
  });
}

conn.on('ready', async () => {
  console.log('[1/2] Limpando remote...');
  await runCmd(`rm -rf ${REMOTE}/* && mkdir -p ${REMOTE}`);
  
  console.log('[2/2] Uploading via tar pipe (single shot)...');
  
  await new Promise((resolve, reject) => {
    const tar = spawn('tar', ['czf', '-', '-C', DIST, '.'], { stdio: ['ignore', 'pipe', 'pipe'] });
    
    conn.exec(`cd ${REMOTE} && tar xzf -`, (err, stream) => {
      if (err) { tar.kill(); return reject(err); }
      
      let done = false;
      stream.on('close', (code) => {
        if (done) return;
        done = true;
        if (code === 0) { console.log('  Upload OK'); resolve(); }
        else reject(new Error(`remote tar exit ${code}`));
      });
      stream.on('error', (e) => { if (!done) { done = true; reject(e); } });
      stream.stderr.on('data', () => {});
      stream.stdout.on('data', () => {});
      
      tar.stdout.pipe(stream.stdin);
      tar.on('error', (e) => { if (!done) { done = true; reject(e); } });
      tar.stderr.on('data', () => {});
    });
  });
  
  const r = await runCmd(`echo "Files: $(find ${REMOTE} -type f | wc -l)"`);
  console.log(r.out.trim());
  
  console.log('=== Deploy completo! ===');
  conn.end();
});

conn.on('error', (err) => { console.error('SSH ERRO:', err.message); process.exit(1); });
conn.on('keyboard-interactive', (n, i, l, p, f) => { f(['MshrUfZrh09hWr#']); });
conn.connect({ host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#', tryKeyboard: true, readyTimeout: 60000 });

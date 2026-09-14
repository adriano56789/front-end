const { Client } = require('ssh2');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const PARTS_DIR = path.resolve(__dirname, '..', 'dist-parts');
const REMOTE_DIR = '/root/dist-restore-parts';
const NEEDED = [6, 7, 8, 9, 10]; // p00..p05 já salvos e validados no servidor

const md5Local = {};
fs.readFileSync(path.join(PARTS_DIR, 'parts.txt'), 'utf8')
  .split('\n').filter(Boolean)
  .forEach(l => { const [i, , h] = l.split('\t'); md5Local[Number(i)] = h; });

let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); try{conn.end();}catch(e){} process.exit(1); } }, 1500000);

const conn = new Client();

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      let errs = '';
      stream.on('data', d => out += d.toString());
      stream.stderr.on('data', d => errs += d.toString());
      stream.on('close', () => resolve({ out, errs }));
    });
  });
}

async function remoteMd5(conn, file) {
  const r = await exec(conn, `md5sum ${file} 2>/dev/null | awk '{print $1}'`);
  return r.out.trim();
}
function localMd5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

async function uploadPart(sftp, i) {
  const local = path.join(PARTS_DIR, 'p' + String(i).padStart(2, '0'));
  const remote = `${REMOTE_DIR}/p${String(i).padStart(2, '0')}`;
  const wantHash = md5Local[i];

  const st = await new Promise(res => sftp.stat(remote, (e, s) => res(e ? null : s)));
  if (st) {
    const rh = await remoteMd5(conn, remote);
    if (rh === wantHash) { console.log(`[OK] p${i} ja existe e valido`); return; }
  }
  console.log(`[UP] enviando p${i} (${fs.statSync(local).size} bytes)...`);
  await new Promise((res, rej) => sftp.fastPut(local, remote, e => e ? rej(e) : res()));
  const rh = await remoteMd5(conn, remote);
  if (rh !== wantHash) throw new Error(`p${i} md5 mismatch remote=${rh} local=${wantHash}`);
  console.log(`[OK] p${i} valido (md5 ok)`);
}

const SCRIPT = `#!/bin/bash
cd /root/dist-restore-parts
cat p00 p01 p02 p03 p04 p05 p06 p07 p08 p09 p10 > /root/dist-restore.tar 2>&1
SIZE=$(stat -c%s /root/dist-restore.tar)
echo "TAR SIZE: $SIZE (esperado 278337024)"
cd /var/www/livego.store
tar -xf /root/dist-restore.tar
echo "EXTRACT DONE"
echo "=== ZERO COUNT ==="
find /var/www/livego.store -type f -size 0 | wc -l
echo "=== ZERO LIST ==="
find /var/www/livego.store -type f -size 0
echo "=== ASSETS ==="
ls -la /var/www/livego.store/assets/
echo "=== CURL ==="
curl -sI -k https://localhost/assets/index-Dpl8EjUl.js | head -6
echo "=== VERSION ==="
cat /var/www/livego.store/version.json
`;

conn.on('ready', () => {
  console.log('[SSH] ready');
  conn.sftp(async (err, sftp) => {
    if (err) { console.error('sftp err', err.message); done = true; clearTimeout(timer); conn.end(); return; }
    try {
      for (const i of NEEDED) await uploadPart(sftp, i);
      console.log('[SFTP] todas as partes em dia. Montando e extraindo...');
      const r = await exec(conn, `echo ${Buffer.from(SCRIPT).toString('base64')} | base64 -d | bash`);
      process.stdout.write(r.out);
      if (r.errs) process.stderr.write(r.errs);
      // limpeza
      await exec(conn, 'rm -f /root/dist-restore.tar; rm -rf /root/dist-restore-parts');
      console.log('\n[LIMPEZA OK]');
    } catch (e) {
      console.error('[ERRO]', e.message);
    }
    done = true; clearTimeout(timer); conn.end();
  });
}).on('error', e => { console.error('[SSH] Error:', e.message); clearTimeout(timer); })
   .connect({ host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#', readyTimeout: 60000 });
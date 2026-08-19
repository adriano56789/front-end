const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const PASSWORD = 'MshrUfZrh09hWr#';
const HOST = '2.25.192.154';

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('keyboard-interactive', (n, i, l, p, f) => f([PASSWORD]));
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: 'root', password: PASSWORD, tryKeyboard: true, readyTimeout: 30000, keepaliveInterval: 10000 });
  });
}

function sshExec(conn, cmd, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const guard = setTimeout(() => { if (!done) { done = true; reject(new Error('timeout')); } }, timeoutMs);
    conn.exec(cmd, (err, stream) => {
      if (err) { done = true; clearTimeout(guard); reject(err); return; }
      let out = '';
      stream.on('data', d => { out += d.toString(); });
      stream.stderr.on('data', d => { out += d.toString(); });
      stream.on('close', (code) => { if (!done) { done = true; clearTimeout(guard); resolve({ code, out }); } });
    });
  });
}

function sftpWrite(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, { concurrency: 1, chunkSize: 32768 }, (err2) => {
        sftp.end();
        if (err2) reject(err2);
        else resolve();
      });
    });
  });
}

async function main() {
  const action = process.argv[2] || 'status';

  console.log('Connecting to VPS...');
  const conn = await connect();
  console.log('Connected!');

  try {
    if (action === 'status') {
      const r = await sshExec(conn, [
        'echo "=== VPS STATUS ==="',
        'uname -a',
        'echo "--- frontend ---"',
        'ls -la /var/www/livego.store/ 2>/dev/null | head -10',
        'ls -la /var/www/livego.store/assets/ 2>/dev/null | head -10',
        'echo "--- backend ---',
        'docker ps --format "{{.Names}}" 2>/dev/null',
        'ls /app/backend/dist/routes/ 2>/dev/null | head -10',
        'echo "--- done ---'
      ].join(' && '));
      console.log(r.out);

    } else if (action === 'patch-roulette') {
      // Patch backend rouletteRoutes.ts on VPS
      const srcFile = path.join(__dirname, 'backend', 'src', 'routes', 'rouletteRoutes.ts');
      if (!fs.existsSync(srcFile)) {
        console.log('Local backend source not found, applying via sed...');
        const r = await sshExec(conn, [
          'cd /app/backend',
          // Check if already patched
          'grep -q "roulette_spin" src/routes/rouletteRoutes.ts && echo "ALREADY_PATCHED" && exit 0',
          // Find the line before "Registrar o giro"
          'LINENUM=$(grep -n "Registrar o giro" src/routes/rouletteRoutes.ts | head -1 | cut -d: -f1)',
          'echo "Found at line $LINENUM"'
        ].join(' ; '));
        console.log(r.out);
      }

    } else if (action === 'upload-tar') {
      // Upload tar with chunked approach
      const tarPath = process.argv[3];
      if (!tarPath || !fs.existsSync(tarPath)) {
        console.error('Usage: node _vps_connect.cjs upload-tar <path-to-tar.gz>');
        process.exit(1);
      }
      console.log('Uploading', tarPath, '...');
      await sftpWrite(conn, tarPath, '/tmp/livego-fe.tar.gz');
      console.log('Upload complete!');

      // Extract
      const r = await sshExec(conn, [
        'set -e',
        'cp -a /var/www/livego.store /tmp/livego-webroot-prev 2>/dev/null || true',
        'tar -xzf /tmp/livego-fe.tar.gz -C /var/www/livego.store',
        '[ -f /var/www/livego.store/index.html ] || { echo ERRO: index.html missing; exit 1; }',
        // Clean old assets
        'tar -tzf /tmp/livego-fe.tar.gz | grep "assets/" | sed "s|.*/||" > /tmp/new-assets.txt',
        'cd /var/www/livego.store',
        'for f in assets/*; do [ -f "$f" ] || continue; base=$(basename "$f"); if ! grep -qxF "$base" /tmp/new-assets.txt; then rm -f "$f"; echo "cleaned: $f"; fi; done',
        'rm -f /tmp/livego-fe.tar.gz /tmp/new-assets.txt',
        'echo DEPLOY_OK'
      ].join(' ; '));
      console.log(r.out);
    }
  } finally {
    conn.end();
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

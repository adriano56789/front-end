const { Client } = require('ssh2');

const PASSWORD = 'MshrUfZrh09hWr#';
const HOST = '2.25.192.154';

function connect(attempt = 1) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('keyboard-interactive', (n, i, l, p, f) => f([PASSWORD]));
    conn.on('ready', () => resolve(conn));
    conn.on('error', (e) => {
      if (attempt < 25) {
        console.log(`  handshake falhou (${e.code || e.message}), tentativa ${attempt + 1}/25...`);
        setTimeout(() => connect(attempt + 1).then(resolve, reject), 1500);
      } else reject(new Error('SSH_FAILED: ' + e.message));
    });
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

async function main() {
  const conn = await connect();
  console.log('Connected!');
  try {
    const r1 = await sshExec(conn, 'ls -la /tmp/livego-frontend-deploy.tar.gz 2>&1; md5sum /tmp/livego-frontend-deploy.tar.gz 2>&1');
    console.log('=== /tmp tarball ===\n' + r1.out);
    const r2 = await sshExec(conn, 'ls -la /var/www/livego.store/index.html /var/www/livego.store/version.json /var/www/livego.store/assets/index-zGcdrRo6.js 2>&1');
    console.log('=== webroot ===\n' + r2.out);
    const r3 = await sshExec(conn, 'cat /var/www/livego.store/version.json 2>&1');
    console.log('=== version.json ===\n' + r3.out);
    const r4 = await sshExec(conn, 'ls -la /var/www/livego.store/assets/ | head -8');
    console.log('=== assets top ===\n' + r4.out);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
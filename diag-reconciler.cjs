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
    conn.connect({ host: HOST, port: 22, username: 'root', password: PASSWORD, tryKeyboard: true, readyTimeout: 15000, keepaliveInterval: 10000 });
  });
}
function sshExec(conn, cmd, timeoutMs = 90000) {
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
    const out = await sshExec(conn, 'cat /app/backend/src/services/SRSReconciler.ts', 30000);
    console.log('=== SRSReconciler.ts ===\n' + out.out);
    const idx = await sshExec(conn, 'cd /app/backend/src && grep -rn "SRSReconciler\\|streamCleanupService.start\\|reconciler.start\\|start()" server.ts index.ts app.ts 2>/dev/null | head; ls /app/backend/src/*.ts 2>/dev/null; cat /app/backend/src/server.ts 2>/dev/null | head -80', 30000);
    console.log('=== server start refs ===\n' + idx.out);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
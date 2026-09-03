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

async function readFile(conn, path) {
  const r = await sshExec(conn, `cat "${path}"`, 30000);
  return r.out;
}

async function main() {
  const conn = await connect();
  console.log('Connected!');
  try {
    const out1 = await readFile(conn, '/app/backend/src/services/streamEndService.ts');
    console.log('=== streamEndService.ts ===\n' + out1);

    const out2 = await readFile(conn, '/app/backend/src/routes/srsRoutes.ts');
    const lines = out2.split('\n');
    const sel = lines.slice(300, 380).join('\n');
    console.log('=== srsRoutes.ts [300-380] ===\n' + sel);

    const out3 = await readFile(conn, '/app/backend/src/services/StreamCleanupService.ts');
    console.log('=== StreamCleanupService.ts ===\n' + out3);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
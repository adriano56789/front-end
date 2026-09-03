const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

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

function sshExec(conn, cmd, timeoutMs = 120000) {
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
  const tmp = 'C:\\Users\\adria\\AppData\\Local\\Temp\\opencode';
  try {
    const r = await sshExec(conn, 'docker exec app-backend base64 -w0 /app/dist/utils/userResponse.js');
    const js = Buffer.from(r.out.trim(), 'base64').toString('utf8');
    fs.writeFileSync(path.join(tmp, 'userResponse.remote.js'), js);
    console.log('JS chars:', js.length);
    const r2 = await sshExec(conn, 'docker exec app-backend sh -c "ls /app/backend/src/utils/ 2>&1 | head -30"');
    console.log('=== src/utils no container ===\n' + r2.out);
    const r3 = await sshExec(conn, 'grep -n "src/\|context\|dockerfile" /app/docker-compose.yml | head -30');
    console.log('=== compose build config ===\n' + r3.out);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
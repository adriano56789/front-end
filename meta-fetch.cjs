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
    // Source .ts
    let r = await sshExec(conn, 'docker exec app-backend base64 -w0 /app/backend/src/routes/metadataRoutes.ts');
    if (r.code !== 0 || !r.out.trim()) {
      console.log('SRC base64 failed, retry via cat pipe', r.out.slice(0, 300));
      r = await sshExec(conn, 'docker exec app-backend sh -c "cat /app/backend/src/routes/metadataRoutes.ts | base64 -w0"');
    }
    const srcB64 = r.out.trim();
    const src = Buffer.from(srcB64, 'base64').toString('utf8');
    fs.writeFileSync(path.join(tmp, 'metadataRoutes.remote.ts'), src);
    console.log('SRC len:', srcB64.length, 'decoded chars:', src.length);

    // Compiled .js
    r = await sshExec(conn, 'docker exec app-backend base64 -w0 /app/dist/routes/metadataRoutes.js');
    const jsB64 = r.out.trim();
    const js = Buffer.from(jsB64, 'base64').toString('utf8');
    fs.writeFileSync(path.join(tmp, 'metadataRoutes.remote.js'), js);
    console.log('JS len:', jsB64.length, 'decoded chars:', js.length);

    console.log('DONE');
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

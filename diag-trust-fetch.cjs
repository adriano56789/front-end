const { Client } = require('ssh2');
const fs = require('fs');

const PASSWORD = 'MshrUfZrh09hWr#';
const HOST = '2.25.192.154';
const REMOTE = '/app/backend/src/routes/userRoutes.ts';
const LOCAL = 'C:\\Users\\adria\\AppData\\Local\\Temp\\opencode\\userRoutes.ts';

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
function sftpGet(conn, remote, local) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastGet(remote, local, (e2) => e2 ? reject(e2) : resolve());
    });
  });
}

async function main() {
  const conn = await connect();
  console.log('Connected!');
  try {
    await sftpGet(conn, REMOTE, LOCAL);
    console.log('Baixado: ' + fs.statSync(LOCAL).size + ' bytes');
    const lines = fs.readFileSync(LOCAL, 'utf8').split('\n');
    console.log('=== fallback branch 205-330 ===');
    console.log(lines.slice(204, 330).join('\n'));
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
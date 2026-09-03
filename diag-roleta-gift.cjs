const { Client } = require('ssh2');

const PASSWORD = 'MshrUfZrh09hWr#';
const HOST = '2.25.192.154';
const HTTP = 'https://livego.store';

function connect(attempt = 1) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('keyboard-interactive', (n, i, l, p, f) => f([PASSWORD]));
    conn.on('ready', () => resolve(conn));
    conn.on('error', (e) => {
      if (attempt < 25) {
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

const b64 = cmd => Buffer.from(cmd).toString('base64');

async function main() {
  const conn = await connect();
  console.log('Connected!');
  try {
    const list = await sshExec(conn, 'ls -la /app/backend/src/routes/ | grep -iE "gift|roulette|wallet|stream"', 30000);
    console.log('ROUTES:\n' + list.out);
    const spin = await sshExec(conn, 'L=$(find /app/backend/src/routes -iname "*roulette*" | head -1); echo "FILE=$L"; cat "$L"', 30000);
    console.log('ROULETTE:\n' + spin.out);
    const gift = await sshExec(conn, 'L=$(find /app/backend/src/routes -iname "*gift*" | head -1); echo "FILE=$L"; cat "$L"', 30000);
    console.log('GIFT:\n' + gift.out);
  } catch (e) {
    console.log('STEPHANS-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
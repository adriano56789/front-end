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
    const r = await sshExec(conn, [
      "echo 'BACKEND_RUNNING:'; docker inspect -f '{{.State.Running}} ({{.State.StartedAt}})' app-backend 2>/dev/null",
      "echo 'OBRAS_API:'; curl -s https://livego.store/api/users/1758193 | node -e \"let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);console.log('obras='+(j.obras||[]).length+' -> '+j.obras.map(o=>o.id).join(', '))}catch(e){console.log('JSON_ERROR '+s.slice(0,80))}})\"",
      "echo 'WEBROOT_VERSION:'; cat /var/www/livego.store/version.json 2>/dev/null",
      "echo 'SW:'; grep -o 'livenza-cache-v[0-9]*' /var/www/livego.store/sw.js 2>/dev/null | head -1",
      "echo 'OBRAS_CONTAIN_GRID:'; grep -c 'object-contain' /var/www/livego.store/assets/index-BJiU9353.js 2>/dev/null || echo 0",
    ].join('; '), 90000);
    console.log(r.out + '(exit ' + r.code + ')');
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
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
  try {
    const r1 = await sshExec(conn, 'sed -n "55,80p" /etc/nginx/sites-enabled/livego');
    console.log('=== livego uploads block ===\n' + r1.out);
    const r2 = await sshExec(conn, 'sed -n "18,40p" /etc/nginx/sites-enabled/api-livego-store');
    console.log('=== api uploads block ===\n' + r2.out);
    const j = `(async()=>{const r=await fetch('http://localhost:3000/api/users/1758193');const u=await r.json();console.log(JSON.stringify({id:u.id,avatar:u.avatar,avatarUrl:u.avatarUrl,coverUrl:u.coverUrl,photos:u.photos&&u.photos.length}));})().catch(e=>console.log('ERR',e.message))`;
    const b64 = Buffer.from(j, 'utf8').toString('base64');
    const r3 = await sshExec(conn, 'echo ' + b64 + ' | base64 -d | docker exec -i app-backend node -e "let s=\'\';process.stdin.on(\'data\',d=>s+=d);process.stdin.on(\'end\',()=>eval(s))"', 60000);
    console.log('=== api duda ===\n' + r3.out);
    const r4 = await sshExec(conn, 'curl -s https://livego.store/uploads/avatars/avatar_1758193_1787599955022.webp -o /tmp/duda_avatar && file /tmp/duda_avatar && ls -la /tmp/duda_avatar', 60000);
    console.log('=== avatar content ===\n' + r4.out);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
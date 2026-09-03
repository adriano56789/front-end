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
    const s1 = "fetch('http://localhost:3000/api/users/1065527').then(r=>r.text()).then(t=>{const j=JSON.parse(t); console.log(JSON.stringify({fans:j.fans,following:j.following,followersList:(j.followersList||[]).length,followingList:(j.followingList||[]).length,displayName:j.displayName,id:j.id}))}).catch(e=>console.log('ERR',e.message))";
    const r1 = await sshExec(conn, 'docker exec app-backend node -e "' + s1.replace(/"/g, '\\"') + '"', 60000);
    console.log('=== perfil adriano (105527... 1065527) ===\n' + r1.out);

    const s2 = "fetch('http://localhost:3000/api/users/1951388').then(r=>r.text()).then(t=>{const j=JSON.parse(t); console.log(JSON.stringify({fans:j.fans,following:j.following,followersList:(j.followersList||[]).length,followingList:(j.followingList||[]).length,id:j.id}))}).catch(e=>console.log('ERR',e.message))";
    const r2 = await sshExec(conn, 'docker exec app-backend node -e "' + s2.replace(/"/g, '\\"') + '"', 60000);
    console.log('=== perfil follower 1951388 ===\n' + r2.out);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
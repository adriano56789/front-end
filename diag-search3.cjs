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
  const js = `
    (async()=>{
      const jwt=require('jsonwebtoken');
      const secret='livego_jwt_secret_2024_production_secure_change_me';
      const token=jwt.sign({id:'1065527'}, secret, {expiresIn:'1h'});
      async function srch(q){
        const r=await fetch('http://localhost:3000/api/search/users?q='+encodeURIComponent(q)+'&limit=20', {headers:{Authorization:'Bearer '+token}});
        const j=await r.json();
        return (j.users||[]).map(u=>({id:u.id,name:u.name,isFollowed:u.isFollowed,isFriend:u.isFriend}));
      }
      console.log('Q=adriano -> '+JSON.stringify(await srch('adriano')));
      console.log('Q=6771613 -> '+JSON.stringify(await srch('6771613')));
      console.log('Q=1951388 -> '+JSON.stringify(await srch('1951388')));
      console.log('Q=1065527 -> '+JSON.stringify(await srch('1065527')));
    })().catch(e=>console.log('ERR',e.message));
  `;
  const b64 = Buffer.from(js, 'utf8').toString('base64');
  const conn = await connect();
  console.log('Connected!');
  try {
    const cmd = 'echo ' + b64 + ' | base64 -d | docker exec -i app-backend node -e "let s=\'\';process.stdin.on(\'data\',d=>s+=d);process.stdin.on(\'end\',()=>eval(s))"';
    const r = await sshExec(conn, cmd, 90000);
    console.log('=== search com token 1065527 ===\n' + r.out);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
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
      const j=(u)=>JSON.stringify(u);
      async function get(p){ return (await (await fetch('http://localhost:3000'+p)).json()); }
      const s=await get('/api/search/users?q=adriano&limit=5');
      console.log('SEARCH.count='+s.count);
      console.log('SEARCH.u0='+JSON.stringify(s.users&&s.users[0]).slice(0,900));
      console.log('SEARCH.u0keys='+JSON.stringify(Object.keys(s.users&&s.users[0]||{})));
      const r=await get('/api/search/users?q=1065527&limit=5');
      console.log('SEARCH_ID.count='+r.count+' u0='+JSON.stringify(r.users&&r.users[0]).slice(0,500));
      const f=await get('/api/users/1065527/following');
      console.log('FOLLOWING.len='+(Array.isArray(f)?f.length:JSON.stringify(f).slice(0,200)));
      if(Array.isArray(f)){ console.log('FOLLOWING.u0='+JSON.stringify(f[0]).slice(0,700)); }
    })().catch(e=>console.log('ERR',e.message));
  `;
  const b64 = Buffer.from(js, 'utf8').toString('base64');
  const conn = await connect();
  console.log('Connected!');
  try {
    const cmd = 'echo ' + b64 + ' | base64 -d | docker exec -i app-backend node -e "let s=\'\';process.stdin.on(\'data\',d=>s+=d);process.stdin.on(\'end\',()=>eval(s))"';
    const r = await sshExec(conn, cmd, 90000);
    console.log('=== results ===\n' + r.out);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
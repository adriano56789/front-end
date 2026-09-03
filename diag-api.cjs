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
    const r0 = await sshExec(conn, "docker port app-backend; echo '---'; docker exec app-backend sh -c 'echo PORT=$PORT; env | grep -i -E \"^(PORT|MONGO|APP_PORT)\" || true'");
    console.log('=== portas ===\n' + r0.out);

    const r1 = await sshExec(conn, "docker exec app-backend sh -c \"curl -s --max-time 15 localhost:3000/api/users?limit=2 | head -c 600\" || echo CURL_FAIL_1");
    console.log('=== API localhost:3000 ===\n' + r1.out);

    const r2 = await sshExec(conn, "docker exec app-backend sh -c \"curl -s --max-time 15 localhost:4000/api/users?limit=2 | head -c 600\" || echo CURL_FAIL_2");
    console.log('=== API localhost:4000 ===\n' + r2.out);

    const r3 = await sshExec(conn, "docker inspect -f '{{range $k,$v := .NetworkSettings.Ports}}{{$k}} -> {{range $v}}{{.HostIp}}:{{.HostPort}}{{end}}; {{end}}' app-backend");
    console.log('=== portmap ===\n' + r3.out);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
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
    const r1 = await sshExec(conn, [
      "echo '--- server.ts (io set/get) ---'; grep -n \"app.set('io'\\|getIO()\\|new Server\\|.use((socket\\|connection(\" /app/backend/src/server.ts | head -40",
      "echo; echo '--- socket.ts ---'; S=$(find /app/backend/src -name socket.ts | head -1); echo FILE=$S; grep -n \"join\\|room\\|user_\|\\.of(\" \"$S\" | head -60",
      "echo; echo '--- handleJoinStream (server.ts) ---'; grep -n \"handleJoinStream\\|socket.join\\|join(\" /app/backend/src/server.ts | head -40",
      "echo; echo '--- server section around handleJoinStream ---'; L=$(grep -n \"handleJoinStream\" /app/backend/src/server.ts | head -1 | cut -d: -f1); if [ -n \"$L\" ]; then sed -n \"$((L-5)),$((L+55))p\" /app/backend/src/server.ts; fi",
    ].join('; '), 60000);
    console.log('SERVER:\n' + r1.out);
  } catch (e) {
    console.log('FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
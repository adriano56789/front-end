const { Client } = require('ssh2');
const HOST = '2.25.192.154';
const USER = 'root';
const PASSWORD = process.env.VPS_PASS || 'MshrUfZrh09hWr#';

const MONGO = `docker exec app-mongodb mongosh 'mongodb://livego_admin:ce0d61d0277da7031e11c97b66a775f01ab0f0bfbe443108@localhost:27017/api?authSource=admin&replicaSet=rs0' --quiet --eval`;

const remote = `
${MONGO} "db.users.find({\\$or:[{id:/host_kick|viewer_kick|user_a|user_b|1932816/i}]},{id:1,name:1,displayName:1,email:1,accountStatus:1,loginCount:1,lastLogin:1,createdAt:1,diamonds:1,isLive:1,_id:0}).toArray().forEach(u=>print(JSON.stringify(u)))"
echo DONE
`;

const b64 = Buffer.from(remote).toString('base64');
const cmd = `echo ${b64} | base64 -d | bash`;

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => finish(prompts.map(() => PASSWORD)));
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 20000, keepaliveInterval: 15000 });
  });
}

function sshExec(conn, command, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const guard = setTimeout(() => { if (!settled) { settled = true; try { conn.end(); } catch {} reject(new Error('timeout')); } }, timeoutMs);
    conn.exec(command, (err, stream) => {
      if (err) { settled = true; clearTimeout(guard); reject(err); return; }
      let out = '';
      stream.on('close', () => { if (!settled) { settled = true; clearTimeout(guard); resolve(out); } });
      stream.on('data', (d) => { out += d.toString(); });
      stream.stderr.on('data', (d) => { out += d.toString(); });
    });
  });
}

async function main() {
  for (let attempt = 1; attempt <= 5; attempt++) {
    let conn = null;
    try {
      conn = await connect();
      const out = await sshExec(conn, cmd, 120000);
      console.log(out);
      try { conn.end(); } catch {}
      process.exit(0);
    } catch (e) {
      console.log(`tentativa ${attempt} falhou: ${e.message}. aguardando 60s...`);
      try { if (conn) conn.end(); } catch {}
      await new Promise((r) => setTimeout(r, 60000));
    }
  }
  console.log('FALHOU');
  process.exit(1);
}
main();
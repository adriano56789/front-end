// Aplica patch da chave 'from', compila no container e reinicia
const { Client } = require('ssh2');

const VPS_HOST = '2.25.192.154';
const VPS_USER = 'root';
const VPS_PASS = 'MshrUfZrh09hWr#';

const c = new Client();

const run = (cmd, t = 300000) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve('TIMEOUT'), t);
  c.exec(cmd, (err, stream) => {
    if (err) { clearTimeout(timer); resolve('EXEC_ERR: ' + err.message); return; }
    let out = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += d.toString(); });
    stream.on('close', () => { clearTimeout(timer); resolve(out.trim()); });
  });
});

const sftpPut = (local, remote) => new Promise((resolve, reject) => {
  c.sftp((err, sftp) => {
    if (err) return reject(err);
    sftp.fastPut(local, remote, (e) => e ? reject(e) : resolve());
  });
});

async function main() {
  console.log('[1] enviando patch...');
  await sftpPut('scripts/patch-fcm-from-remote.cjs', '/tmp/patch-fcm-from-remote.cjs');

  console.log('[2] backup + aplicando...');
  console.log(await run("cd /app/backend && cp src/services/firebaseService.ts src/services/firebaseService.ts.bak-fcmfrom && node /tmp/patch-fcm-from-remote.cjs"));

  console.log('[3] copiando p/ container + compilando...');
  console.log(await run("docker cp /app/backend/src/services/firebaseService.ts app-backend:/app/src/services/firebaseService.ts && docker exec app-backend sh -c 'cd /app && node node_modules/typescript/bin/tsc 2>&1 | head -10; echo EXIT:$?'"));

  console.log('[4] dist tem o fix?');
  console.log(await run("docker exec app-backend sh -c 'grep -c \"key === .from.\" dist/services/firebaseService.js'"));

  console.log('[5] reiniciando...');
  console.log(await run("docker restart app-backend 2>&1"));
  await new Promise(r => setTimeout(r, 10000));
  console.log('health:', await run("curl -s -o /dev/null -w '%{http_code}' https://livego.store/api/health"));

  c.end();
  setTimeout(() => process.exit(0), 2000);
}
c.on('ready', () => main().catch((e) => { console.error('ERROR:', e.message); c.end(); setTimeout(() => process.exit(1), 1000); }))
  .on('error', (err) => { console.error('SSH_ERROR:', err.message); process.exit(1); })
  .on('keyboard-interactive', (n, i, il, prompts, finish) => finish(prompts.map(() => VPS_PASS)))
  .connect({ host: VPS_HOST, port: 22, username: VPS_USER, tryKeyboard: true, readyTimeout: 20000, connTimeout: 15000 });

setTimeout(() => process.exit(0), 180000);

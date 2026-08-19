// Aplica patch srsRoutes, compila com tsc local, reinicia serviço 'backend'
const { Client } = require('ssh2');

const VPS_HOST = '2.25.192.154';
const VPS_USER = 'root';
const VPS_PASS = 'MshrUfZrh09hWr#';

const c = new Client();

const run = (cmd, t = 120000) => new Promise((resolve) => {
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
  console.log('[1] enviando patch 2...');
  await sftpPut('scripts/patch-screensec2-remote.cjs', '/tmp/patch-screensec2-remote.cjs');

  console.log('[2] aplicando...');
  console.log(await run("node /tmp/patch-screensec2-remote.cjs"));

  console.log('[3] compilando (tsc local)...');
  console.log(await run("cd /app/backend && ./node_modules/.bin/tsc --noEmit 2>&1 | head -20; echo EXIT:$?"));

  console.log('[4] restart serviço backend...');
  console.log(await run("cd /app && docker compose restart backend 2>&1 | tail -3"));

  console.log('[5] aguardando health...');
  await new Promise(r => setTimeout(r, 8000));
  console.log(await run("curl -s -o /dev/null -w '%{http_code}' https://livego.store/api/health"));

  console.log('\n[6] screenSecurityEnabled na resposta?');
  console.log(await run("curl -s 'https://livego.store/api/streams?limit=5' | grep -o 'screenSecurityEnabled[^,]*' | head -5; echo '---(vazio = nenhum host ativo com campo)---'"));

  c.end();
  setTimeout(() => process.exit(0), 2000);
}
c.on('ready', () => main().catch((e) => { console.error('ERROR:', e.message); c.end(); setTimeout(() => process.exit(1), 1000); }))
  .on('error', (err) => { console.error('SSH_ERROR:', err.message); process.exit(1); })
  .on('keyboard-interactive', (n, i, il, prompts, finish) => finish(prompts.map(() => VPS_PASS)))
  .connect({ host: VPS_HOST, port: 22, username: VPS_USER, tryKeyboard: true, readyTimeout: 20000, connTimeout: 15000 });

setTimeout(() => process.exit(0), 180000);

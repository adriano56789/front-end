// Inspect VPS: backend container structure + check if voiceRoom is present
const { Client } = require('ssh2');
const c = new Client();
const VPS_HOST = '2.25.192.154';
const VPS_USER = 'root';
const VPS_PASS = 'MshrUfZrh09hWr#';

const run = (cmd, t = 25000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => resolve('TIMEOUT'), t);
  c.exec(cmd, (err, stream) => {
    if (err) { clearTimeout(timer); reject(err); return; }
    let out = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += d.toString(); });
    stream.on('close', () => { clearTimeout(timer); resolve(out.trim()); });
  });
});

async function main() {
  const cmds = [
    ['containers', `docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' 2>&1 | head -20`],
    ['backend /app tree', `docker exec app-backend sh -c 'ls /app 2>/dev/null | head -30'`],
    ['backend src dir', `docker exec app-backend sh -c 'ls /app/src 2>/dev/null | head -30'`],
    ['backend src/models', `docker exec app-backend sh -c 'ls /app/src/models 2>/dev/null | head -40'`],
    ['backend src/routes', `docker exec app-backend sh -c 'ls /app/src/routes 2>/dev/null | head -40'`],
    ['backend server.ts has voiceRoom?', `docker exec app-backend sh -c 'grep -c "voice" /app/src/server.ts 2>/dev/null; grep -n "voice" /app/src/server.ts 2>/dev/null | head -5'`],
    ['backend src exists? or root files', `docker exec app-backend sh -c 'ls /app/*.ts 2>/dev/null | head; echo ---; ls /app/src 2>/dev/null | head -5'`],
    ['backend entry/workdir', `docker inspect app-backend --format '{{.Config.Cmd}} | {{.Config.WorkingDir}}' 2>&1`],
    ['backend dist?', `docker exec app-backend sh -c 'ls /app/dist 2>/dev/null | head -10'`],
    ['frontend webroot', `ls /var/www/livego.store/index.html 2>&1; ls /var/www/livego.store/assets 2>/dev/null | head -5`],
  ];
  for (const [label, cmd] of cmds) {
    console.log(`\n--- ${label} ---`);
    console.log(await run(cmd));
  }
  c.end();
}

c.on('ready', () => main().catch(e => { console.error('ERROR:' + e.message); c.end(); }))
  .on('error', (err) => { console.error('SSH_ERROR:' + err.message); })
  .on('keyboard-interactive', (n, i, il, prompts, finish) => finish(prompts.map(() => VPS_PASS)))
  .connect({ host: VPS_HOST, port: 22, username: VPS_USER, tryKeyboard: true, readyTimeout: 20000, connTimeout: 20000 });

setTimeout(() => process.exit(0), 190000);

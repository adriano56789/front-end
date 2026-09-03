// Inspect VPS server.ts route-mount pattern + imports to find insertion points
const { Client } = require('ssh2');
const c = new Client();
const VPS_HOST = '2.25.192.154';
const VPS_USER = 'root';
const VPS_PASS = process.env.VPS_PASS || 'MshrUfZrh09hWr#';

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
    ['routes imports list', `docker exec app-backend sh -c "grep -n \"import .*Routes from './routes/\" /app/src/server.ts 2>/dev/null | head -40"`],
    ['app.use api mounts', `docker exec app-backend sh -c "grep -n \"app.use('/api/\" /app/src/server.ts 2>/dev/null | head -60"`],
    ['next after last api mount', `docker exec app-backend sh -c "grep -n \"/api/\" /app/src/server.ts 2>/dev/null | tail -20"`],
    ['streamMessageRoutes existence in src/routes', `docker exec app-backend sh -c "ls /app/src/routes/ | grep -iE 'stream|live' "`],
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

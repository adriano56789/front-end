const { Client } = require('ssh2');
const VPS = { host: '2.25.192.154', user: 'root', pass: 'MshrUfZrh09hWr#' };
const c = new Client();
const run = (cmd, t = 60000) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve('TIMEOUT'), t);
  c.exec(cmd, (err, stream) => {
    if (err) { clearTimeout(timer); resolve('EXEC_ERR: ' + err.message); return; }
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += d.toString());
    stream.on('close', () => { clearTimeout(timer); resolve(out.trim()); });
  });
});
async function main() {
  console.log(await run(`python3 -c "import yaml,sys; d=yaml.safe_load(open('/app/docker-compose.yml')); import json; s=d['services']['app-backend']; print(json.dumps({k:s.get(k) for k in ['build','command','volumes','restart','env_file']}, indent=1))" 2>/dev/null || sed -n '/app-backend/,/^  [a-z]/p' /app/docker-compose.yml | head -60`));
  console.log('---ROUTES---');
  console.log(await run(`ls /app/backend/routes/ 2>/dev/null | head; echo ---dist---; ls /app/backend/dist 2>/dev/null | head; echo ---src---; ls /app/backend/src 2>/dev/null | head -5; echo ---liveRoutes---; ls /app/backend/src/routes/liveRoutes* /app/backend/dist/routes/liveRoutes* /app/backend/routes/liveRoutes* 2>/dev/null`));
  c.end();
  setTimeout(() => process.exit(0), 1500);
}
c.on('ready', () => main().catch(e => { console.error('ERR', e.message); c.end(); }))
 .on('error', e => console.error('SSH_ERROR:', e.message))
 .on('keyboard-interactive', (n, i, il, prompts, finish) => finish(prompts.map(() => VPS.pass)))
 .connect({ host: VPS.host, port: 22, username: VPS.user, tryKeyboard: true, readyTimeout: 20000 });

// Temp: inspeciona o JoinEffectOverlay DEPLOYADO na VPS (/var/www/livego.store)
const { Client } = require('ssh2');

const c = new Client();
const run = (cmd, t = 60000) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve('TIMEOUT'), t);
  c.exec(cmd, (err, stream) => {
    if (err) { clearTimeout(timer); return resolve('EXEC_ERR: ' + err.message); }
    let out = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += d.toString(); });
    stream.on('close', () => { clearTimeout(timer); resolve(out.trim()); });
  });
});

c.on('ready', async () => {
  console.log('=== assets com join-effect-pop ===');
  console.log(await run(`grep -rl "join-effect-pop" /var/www/livego.store/assets/ 2>/dev/null | head -5`));
  console.log('=== contexto do posicionamento (pb-*/items-*) ===');
  console.log(await run(`grep -ro "fixed inset-0 pointer-events-none select-none flex items-[a-z]* justify-center pb-\\[[0-9a-z%]*\\]" /var/www/livego.store/assets/ 2>/dev/null | head -10`));
  console.log('=== versao ===');
  console.log(await run(`cat /var/www/livego.store/version.json 2>/dev/null | head -5`));
  console.log('=== ls webroot ===');
  console.log(await run(`ls -la /var/www/livego.store/ | head -20`));
  c.end();
}).on('error', (e) => { console.error('SSH_ERR', e.message); process.exit(1); });

c.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['MshrUfZrh09hWr#']);
});

c.connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  password: 'MshrUfZrh09hWr#',
  tryKeyboard: true,
  readyTimeout: 60000,
  keepaliveInterval: 5000,
});

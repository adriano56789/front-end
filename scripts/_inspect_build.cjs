// Inspect VPS backend build structure for voiceRoom deploy
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
    ['tsconfig outDir/rootDir', `docker exec app-backend sh -c 'cat /app/tsconfig.json 2>/dev/null | head -40'`],
    ['dist root', `docker exec app-backend sh -c 'ls /app/dist 2>/dev/null | head -30'`],
    ['dist/models has VoiceRoom?', `docker exec app-backend sh -c 'ls /app/dist/models 2>/dev/null | grep -i voice; grep -c VoiceRoom /app/dist/models/index.js 2>/dev/null'`],
    ['dist/routes has voiceRoom?', `docker exec app-backend sh -c 'ls /app/dist/routes 2>/dev/null | grep -i voice'`],
    ['dist/server.js has voice-rooms?', `docker exec app-backend sh -c 'grep -c "voice-rooms" /app/dist/server.js 2>/dev/null; grep -c "voiceRoomRoutes" /app/dist/server.js 2>/dev/null'`],
    ['dist structure (server.js location)', `docker exec app-backend sh -c 'ls -la /app/dist/*.js 2>/dev/null | head; echo ---; find /app/dist -maxdepth 2 -name "server.js" 2>/dev/null'`],
    ['how dist built - package scripts', `docker exec app-backend sh -c 'grep -A15 "scripts" /app/package.json 2>/dev/null | head -25'`],
    ['src/models/index.ts tail (last exports)', `docker exec app-backend sh -c 'tail -20 /app/src/models/index.ts 2>/dev/null'`],
    ['src/server.ts voice present?', `docker exec app-backend sh -c 'grep -n "voice" /app/src/server.ts 2>/dev/null | head'`],
    ['src node_modules tsc present?', `docker exec app-backend sh -c 'ls /app/node_modules/.bin/tsc 2>/dev/null && echo TSC_OK || echo NO_TSC'`],
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

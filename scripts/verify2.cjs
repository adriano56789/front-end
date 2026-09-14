const { Client } = require('ssh2');

const SCRIPT = `#!/bin/bash
echo "=== ZERO BYTES POR DIR ==="
find /var/www/livego.store -type f -size 0 2>/dev/null | awk -F/ '{print $4}' | sort | uniq -c
echo "=== ZERO EXEMPLOS ==="
find /var/www/livego.store -type f -size 0 2>/dev/null | head -5
echo "=== CURL COM HOST livego.store ==="
curl -sI -k -H "Host: livego.store" https://127.0.0.1/assets/index-Dpl8EjUl.js | head -5
echo "=== CURL ANIMATION (se 0 byte deve dar 404/200 vazio) ==="
curl -sI -k -H "Host: livego.store" https://127.0.0.1/animations/coracao.json | head -5
echo "=== CURL FOGUETE MP4 ==="
curl -sI -k -H "Host: livego.store" https://127.0.0.1/animations/foguete.mp4 | head -5
echo "=== WASM ==="
ls -la /var/www/livego.store/wasm/ | awk '{print $5, $9}'
echo "=== MODELS ==="
ls -la /var/www/livego.store/models/ | awk '{print $5, $9}'
echo "=== SOUNDS ==="
ls -la /var/www/livego.store/sounds/ | awk '{print $5, $9}'
echo "=== MEDIAPIPE ==="
du -sh /var/www/livego.store/mediapipe/ /var/www/livego.store/openmakeup/ 2>&1
echo "=== BACKEND ASSETS (untracked git) ==="
ls -la /app/backend/assets/ 2>&1 | head
du -sh /app/backend/assets 2>&1
echo "=== MONGO NETWORK AGORA ==="
docker inspect app-mongodb --format "net={{range \$k,\$v := .NetworkSettings.Networks}}{{\$k}} IP={{\$v.IPAddress}}{{end}}" 2>&1
`;

const b64 = Buffer.from(SCRIPT).toString('base64');
const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); try{conn.end();}catch(e){} process.exit(1); } }, 120000);

conn.on('ready', () => {
  conn.exec(`echo ${b64} | base64 -d | bash`, (e, stream) => {
    if (e) { console.error(e); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { done = true; clearTimeout(timer); conn.end(); });
  });
}).on('error', e => { console.error(e); clearTimeout(timer); })
   .connect({ host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#', readyTimeout: 60000 });
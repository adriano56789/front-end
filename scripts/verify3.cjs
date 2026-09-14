const { Client } = require('ssh2');

const SCRIPT = `#!/bin/bash
echo "=== ZERO BYTES POR SUBDIR ==="
find /var/www/livego.store -type f -size 0 2>/dev/null | sed 's|^/var/www/livego.store/||' | cut -d/ -f1 | sort | uniq -c
echo "=== ZERO COUNT TOTAL ==="
find /var/www/livego.store -type f -size 0 2>/dev/null | wc -l
echo "=== ORIGIN TESTS (Host: livego.store) ==="
for f in assets/react-3Y9XYdBH.js assets/index-CFc36G9A.css assets/index-Dpl8EjUl.js sw.js manifest.json; do
  code=$(curl -s -o /dev/null -w "%{http_code} %{size_download}" -k -H "Host: livego.store" "https://127.0.0.1/$f")
  echo "$f -> $code"
done
echo "=== MONGO NETWORK ==="
docker inspect app-mongodb --format '{{range .NetworkSettings.Networks}}{{.NetworkID}} {{.IPAddress}}{{end}}' 2>&1
echo "=== BACKEND STABLE? ==="
docker ps --filter "name=app-backend" --format "{{.Names}} {{.Status}}"
docker inspect app-backend --format "restarts={{.RestartCount}}" 2>&1
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
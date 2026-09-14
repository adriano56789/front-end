const { Client } = require('ssh2');

const SCRIPT = `#!/bin/bash
mkdir -p /root/dist-restore-parts
BS=26214400
for i in $(seq 0 6); do
  skip=$i
  if [ $(( skip * BS + BS )) -le $(stat -c%s /root/dist-restore.tar) ]; then
    dd if=/root/dist-restore.tar of=/root/dist-restore-parts/p$(printf %02d $i) bs=$BS skip=$skip count=1 2>/dev/null
  fi
done
echo "=== REMOTE PARTS ==="
ls -la /root/dist-restore-parts/
echo "=== MD5 ==="
md5sum /root/dist-restore-parts/* 2>&1
rm -f /root/dist-restore.tar
echo "PARTIAL REMOVIDO"
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
   .connect({ host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#', readyTimeout: 30000 });
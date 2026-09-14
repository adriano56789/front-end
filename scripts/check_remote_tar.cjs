const { Client } = require('ssh2');

const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); try{conn.end();}catch(e){} process.exit(1); } }, 60000);

conn.on('ready', () => {
  conn.exec('ls -la /root/dist-restore.tar 2>&1; date -u', (e, stream) => {
    if (e) { console.error(e); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { done = true; clearTimeout(timer); conn.end(); });
  });
}).on('error', e => { console.error(e); clearTimeout(timer); })
   .connect({ host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#', readyTimeout: 30000 });
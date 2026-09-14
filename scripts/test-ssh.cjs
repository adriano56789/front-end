const { Client } = require('ssh2');

const conn = new Client();
let done = false;

const timer = setTimeout(() => {
  if (!done) {
    console.log('[TIMEOUT] 45s sem resposta. Abortando.');
    process.exit(1);
  }
}, 45000);

conn.on('ready', () => {
  console.log('[SSH] OK');
  conn.exec('docker ps --format "{{.Names}} {{.Status}}" && echo ASSETS && ls /var/www/livego.store/assets/ 2>&1 && echo INDEX && head -5 /var/www/livego.store/index.html', (e, stream) => {
    if (e) { console.error(e); clearTimeout(timer); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => { done = true; clearTimeout(timer); conn.end(); process.exit(0); });
  });
}).on('error', e => {
  console.error('[SSH] Error:', e.message);
  clearTimeout(timer);
  process.exit(1);
}).connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  password: 'MshrUfZrh09hWr#',
  readyTimeout: 30000
});

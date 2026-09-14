const { Client } = require('ssh2');
const path = require('path');

const LOCAL_TAR = path.resolve(__dirname, '..', 'dist-restore.tar');
const REMOTE_TAR = '/root/dist-restore.tar';

const conn = new Client();
let done = false;
const timer = setTimeout(() => { if (!done) { console.log('[TIMEOUT]'); try{conn.end();}catch(e){} process.exit(1); } }, 600000);

conn.on('ready', () => {
  console.log('[SFTP] conectado. Upload de', LOCAL_TAR);
  conn.sftp((err, sftp) => {
    if (err) { console.error('sftp error:', err.message); conn.end(); return; }
    sftp.fastPut(LOCAL_TAR, REMOTE_TAR, (perr) => {
      if (perr) { console.error('fastPut error:', perr.message); conn.end(); return; }
      console.log('[SFTP] upload completo:', REMOTE_TAR);

      const SCRIPT = [
        'cd /var/www/livego.store',
        'tar -xf ' + REMOTE_TAR,
        'echo "EXTRACT OK"',
        'echo "=== ZERO COUNT (esperado ~3 = .gitkeep) ==="',
        'find /var/www/livego.store -type f -size 0 | wc -l',
        'find /var/www/livego.store -type f -size 0',
        'echo "=== ASSETS ==="',
        'ls -la /var/www/livego.store/assets/',
        'echo "=== CURL ASSET ==="',
        'curl -sI -k https://localhost/assets/index-Dpl8EjUl.js | head -6',
        'echo "=== VERSION ==="',
        'cat /var/www/livego.store/version.json',
        'ls -la /var/www/livego.store/ | head -30',
      ].join(' && ');

      conn.exec('echo ' + Buffer.from(SCRIPT).toString('base64') + ' | base64 -d | bash', (e, stream) => {
        if (e) { console.error('exec error:', e); conn.end(); return; }
        let out = '';
        stream.on('data', d => { out += d.toString(); process.stdout.write(d); });
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => {
          done = true; clearTimeout(timer);
          console.log('\n[DONE]');
          conn.end();
        });
      });
    });
  });
}).on('error', e => {
  console.error('[SSH] Error:', e.message);
  clearTimeout(timer);
}).connect({
  host: '2.25.192.154', port: 22, username: 'root',
  password: 'MshrUfZrh09hWr#', readyTimeout: 30000
});
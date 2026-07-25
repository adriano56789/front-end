const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const TAR_FILE = path.resolve(__dirname, 'dist.tar.gz');
const REMOTE_DIR = '/var/www/livego.store';

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  
  // Step 1: Upload tar via SFTP
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP error:', err); conn.end(); process.exit(1); return; }
    
    const remoteTar = '/tmp/dist.tar.gz';
    console.log('Uploading dist.tar.gz...');
    sftp.fastPut(TAR_FILE, remoteTar, (err) => {
      if (err) { console.error('Upload error:', err); conn.end(); process.exit(1); return; }
      console.log('Upload done! Extracting...');
      
      // Step 2: Backup old, extract new, reload nginx
      const cmd = [
        `echo "Backing up old files..."`,
        `cp -r ${REMOTE_DIR} ${REMOTE_DIR}.bak.$(date +%s) 2>/dev/null || true`,
        `echo "Extracting..."`,
        `tar -xzf ${remoteTar} -C ${REMOTE_DIR} --strip-components=1`,
        `rm -f ${remoteTar}`,
        `echo "Reloading nginx..."`,
        `nginx -t 2>&1 && nginx -s reload 2>&1 || echo "nginx reload failed"`,
        `echo "Files in dir:"`,
        `ls -la ${REMOTE_DIR}/ | head -15`,
        `echo "DEPLOY DONE"`
      ].join(' && ');
      
      conn.exec(cmd, (err, stream) => {
        if (err) { console.error('exec error:', err); conn.end(); process.exit(1); return; }
        let out = '';
        stream.stdout.on('data', (d) => { out += d.toString(); });
        stream.stderr.on('data', (d) => { out += 'STDERR: ' + d.toString(); });
        stream.on('close', () => {
          console.log(out);
          conn.end();
          process.exit(0);
        });
      });
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH ERROR:', err.message);
  process.exit(1);
});

conn.connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  readyTimeout: 15000,
  tryKeyboard: true
});

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['MshrUfZrh09hWr#']);
});

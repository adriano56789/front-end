const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const REMOTE_DIR = '/var/www/livego.store';

function getAllFiles(dir, basePath = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = path.join(basePath, entry.name);
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, relPath));
    } else {
      files.push({ local: fullPath, remote: path.join(REMOTE_DIR, relPath).replace(/\\/g, '/') });
    }
  }
  return files;
}

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  const files = getAllFiles(DIST_DIR);
  console.log(`Uploading ${files.length} files to ${REMOTE_DIR}...`);

  let uploaded = 0;
  let errors = 0;

  function uploadNext() {
    if (uploaded + errors >= files.length) {
      console.log(`\nDone! ${uploaded} uploaded, ${errors} errors`);
      conn.end();
      process.exit(0);
      return;
    }
    const file = files[uploaded + errors];
    conn.sftp((err, sftp) => {
      if (err) { console.error('SFTP error:', err); conn.end(); process.exit(1); return; }
      const remoteDir = path.dirname(file.remote);
      conn.exec(`mkdir -p ${remoteDir}`, (err2, stream) => {
        if (err2) { console.error('Mkdir error:', err2); errors++; uploadNext(); return; }
        stream.on('close', () => {
          sftp.fastPut(file.local, file.remote, (err3) => {
            if (err3) {
              console.error(`ERROR: ${file.remote}: ${err3.message}`);
              errors++;
            } else {
              uploaded++;
              if (uploaded % 20 === 0) console.log(`  ${uploaded}/${files.length}...`);
            }
            uploadNext();
          });
        });
      });
    });
  }

  uploadNext();
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

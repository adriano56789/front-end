const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const REMOTE = '/var/www/livego.store';

function getAllFiles(dir, base = '') {
  const files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const rel = base ? base + '/' + item : item;
    if (fs.statSync(full).isDirectory()) {
      files.push(...getAllFiles(full, rel));
    } else {
      files.push({ local: full, remote: rel });
    }
  }
  return files;
}

const allFiles = getAllFiles(DIST);
console.log(`Total: ${allFiles.length} files`);

const conn = new Client();

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, { concurrency: 4, chunkSize: 32768 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function mkdirp(sftp, dir) {
  return new Promise((resolve) => {
    sftp.mkdir(dir, (err) => {
      if (!err || err.code === 4 || err.code === 11) return resolve();
      const parent = path.dirname(dir);
      if (parent === dir || parent === '/' || parent === REMOTE) return resolve();
      mkdirp(sftp, parent).then(() => {
        sftp.mkdir(dir, () => resolve());
      }).catch(() => resolve());
    });
  });
}

conn.on('ready', async () => {
  console.log('[1/2] Limpando remote...');
  await new Promise((resolve, reject) => {
    conn.exec(`rm -rf ${REMOTE}/*`, (err, stream) => {
      if (err) return reject(err);
      stream.on('close', resolve);
      stream.on('error', reject);
      stream.stderr.on('data', () => {});
      stream.stdout.on('data', () => {});
    });
  });
  
  console.log('[2/2] Uploading via sftp...');
  
  await new Promise((resolve, reject) => {
    conn.sftp(async (err, sftp) => {
      if (err) return reject(err);
      
      const dirs = new Set([REMOTE]);
      let uploaded = 0;
      
      for (const file of allFiles) {
        const remoteDir = path.dirname(REMOTE + '/' + file.remote).replace(/\\/g, '/');
        if (!dirs.has(remoteDir)) {
          dirs.add(remoteDir);
          await mkdirp(sftp, remoteDir);
        }
        
        try {
          await uploadFile(sftp, file.local, REMOTE + '/' + file.remote);
          uploaded++;
          if (uploaded % 100 === 0 || uploaded === allFiles.length) {
            process.stdout.write(`\r  ${uploaded}/${allFiles.length}`);
          }
        } catch (e) {
          console.error(`\n  Failed: ${file.remote}: ${e.message}`);
        }
      }
      console.log('\n  Done.');
      resolve();
    });
  });
  
  console.log('=== Deploy completo! ===');
  conn.end();
});

conn.on('error', (err) => { console.error('SSH ERRO:', err.message); process.exit(1); });
conn.on('keyboard-interactive', (n, i, l, p, f) => { f(['MshrUfZrh09hWr#']); });
conn.connect({ host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#', tryKeyboard: true, readyTimeout: 60000 });

const {Client} = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '2.25.192.154';
const PW = 'MshrUfZrh09hWr#';
const WEBROOT = '/var/www/livego.store';
const DIST = path.join(__dirname, 'dist');

function connect() {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('keyboard-interactive', (n,i,l,p,f) => f(p.map(() => PW)));
    c.on('ready', () => resolve(c));
    c.on('error', reject);
    c.connect({host:HOST, port:22, username:'root', password:PW, tryKeyboard:true, readyTimeout:30000, keepaliveInterval:15000});
  });
}

function sshExec(c, cmd, timeout=60000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve('TIMEOUT'), timeout);
    c.exec(cmd, (e, r) => {
      if (e) { clearTimeout(t); return reject(e); }
      let d = '';
      r.on('data', d2 => d += d2);
      r.stderr.on('data', d2 => d += d2);
      r.on('close', () => { clearTimeout(t); resolve(d); });
    });
  });
}

function sftpUpload(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, {concurrency:1, chunkSize:64*1024*1024}, (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

function sftpMkdirP(sftp, dirPath) {
  return new Promise((resolve) => {
    sftp.mkdir(dirPath, (err) => {
      if (err && err.code === 4) { // already exists
        resolve();
      } else {
        resolve();
      }
    });
  });
}

function sftpStat(sftp, remotePath) {
  return new Promise((resolve) => {
    sftp.stat(remotePath, (err, stat) => {
      if (err) resolve(null);
      else resolve(stat);
    });
  });
}

async function walkDir(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(DIST, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results = results.concat(await walkDir(full));
    } else {
      const stat = fs.statSync(full);
      results.push({ local: full, rel, size: stat.size });
    }
  }
  return results;
}

async function main() {
  const c = await connect();
  console.log('Connected!');

  const sftp = await new Promise((resolve, reject) => {
    c.sftp((err, sftp) => err ? reject(err) : resolve(sftp));
  });

  // Get remote file sizes via find
  const remoteSizesStr = await sshExec(c, `find ${WEBROOT} -type f -exec stat -c '%s %n' {} \\;`);
  const remoteSizes = {};
  for (const line of remoteSizesStr.trim().split('\n')) {
    const idx = line.indexOf(' ');
    if (idx > 0) {
      remoteSizes[line.slice(idx + 1)] = parseInt(line.slice(0, idx)) || 0;
    }
  }

  console.log('Local dist scan...');
  const localFiles = await walkDir(DIST);
  console.log(`Local files: ${localFiles.length}`);

  // Find files that are missing or different size
  const toUpload = localFiles.filter(f => {
    const remotePath = `${WEBROOT}/${f.rel}`;
    return remoteSizes[remotePath] === undefined || remoteSizes[remotePath] !== f.size;
  });

  console.log(`Need to upload: ${toUpload.length} files`);
  
  // Create needed dirs
  const dirs = new Set();
  for (const f of toUpload) {
    const dir = path.dirname(`${WEBROOT}/${f.rel}`);
    dirs.add(dir);
  }
  for (const d of dirs) {
    // Recursive mkdir
    const parts = d.split('/').filter(Boolean);
    let cur = '';
    for (const p of parts) {
      cur += '/' + p;
      await sftpMkdirP(sftp, cur);
    }
  }

  // Upload in batches of 5 concurrent
  let uploaded = 0;
  const BATCH = 5;
  for (let i = 0; i < toUpload.length; i += BATCH) {
    const batch = toUpload.slice(i, i + BATCH);
    await Promise.all(batch.map(async (f) => {
      const remotePath = `${WEBROOT}/${f.rel}`;
      try {
        await sftpUpload(sftp, f.local, remotePath);
        uploaded++;
      } catch (err) {
        console.error(`FAIL: ${f.rel} — ${err.message}`);
      }
    }));
    if (uploaded % 50 === 0 || uploaded === toUpload.length) {
      console.log(`  ${uploaded}/${toUpload.length} uploaded`);
    }
  }

  // Verify
  const vpsCount = await sshExec(c, `find ${WEBROOT} -type f | wc -l`);
  console.log(`\nVPS total files: ${vpsCount.trim()}`);

  c.end();
  console.log('DONE');
}

main().catch(e => { console.error(e.message); process.exit(1); });

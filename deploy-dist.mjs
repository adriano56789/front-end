import { Client } from 'ssh2';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const DIST_DIR = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\front-end\\dist';
const REMOTE_DIR = '/tmp/frontend-dist';

function getAllFiles(dir, base = dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...getAllFiles(full, base));
    } else {
      files.push(full);
    }
  }
  return files;
}

const files = getAllFiles(DIST_DIR);
console.log(`Uploading ${files.length} files...`);

const conn = new Client();

conn.on('ready', () => {
  conn.exec(`rm -rf ${REMOTE_DIR} && mkdir -p ${REMOTE_DIR}`, (err, stream) => {
    if (err) { console.error(err); conn.end(); process.exit(1); }
    stream.on('close', () => uploadNext(0));
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
  });
}).on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
  finish(['MshrUfZrh09hWr#']);
}).on('error', (err) => {
  console.error('CONNECTION ERROR:', err.message);
  process.exit(1);
}).connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  password: 'MshrUfZrh09hWr#',
  readyTimeout: 20000,
  tryKeyboard: true
});

function uploadNext(i) {
  if (i >= files.length) {
    console.log('All files uploaded. Copying into container...');
    conn.exec(
      `docker cp ${REMOTE_DIR}/. livego-frontend:/usr/share/nginx/html/ && echo "DONE - dist deployed!" && rm -rf ${REMOTE_DIR}`,
      (err, stream) => {
        if (err) { console.error(err); conn.end(); process.exit(1); }
        stream.on('close', () => { conn.end(); process.exit(0); });
        stream.on('data', (d) => process.stdout.write(d));
        stream.stderr.on('data', (d) => process.stderr.write(d));
      }
    );
    return;
  }
  const localPath = files[i];
  const relPath = relative(DIST_DIR, localPath).replace(/\\/g, '/');
  const remotePath = `${REMOTE_DIR}/${relPath}`;
  const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));

  conn.exec(`mkdir -p ${remoteDir}`, (err, stream) => {
    if (err) { console.error(err); conn.end(); process.exit(1); }
    stream.on('close', () => {
      conn.sftp((err, sftp) => {
        if (err) { console.error(err); conn.end(); process.exit(1); }
        const data = readFileSync(localPath);
        sftp.writeFile(remotePath, data, (err) => {
          if (err) { console.error(`FAIL: ${relPath}`, err); conn.end(); process.exit(1); }
          console.log(`  ${relPath} (${(data.length/1024).toFixed(1)}KB)`);
          uploadNext(i + 1);
        });
      });
    });
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
  });
}

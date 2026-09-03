const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIST = path.join(__dirname, 'dist');
const REMOTE = '/var/www/livego.store';
let uploaded = 0, total = 0;

function countFiles(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory()) countFiles(path.join(dir, item.name));
    else total++;
  }
}

async function uploadDir(sftp, localDir, remoteDir) {
  for (const item of fs.readdirSync(localDir, { withFileTypes: true })) {
    const lp = path.join(localDir, item.name);
    const rp = remoteDir + '/' + item.name;
    if (item.isDirectory()) {
      await new Promise(r => sftp.mkdir(rp, () => r()));
      await uploadDir(sftp, lp, rp);
    } else {
      await new Promise(r => {
        sftp.fastPut(lp, rp, { concurrency: 10 }, (err) => {
          if (err) console.error('FAIL:', rp, err.message);
          else { uploaded++; if (uploaded % 200 === 0 || uploaded === total) console.log(uploaded + '/' + total); }
          r();
        });
      });
    }
  }
}

countFiles(DIST);
console.log('Files:', total);

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected');
  conn.sftp((err, sftp) => {
    if (err) { console.error(err); conn.end(); process.exit(1); }
    conn.exec('rm -rf ' + REMOTE + '/*', async () => {
      await uploadDir(sftp, DIST, REMOTE);
      console.log('DONE ' + uploaded + '/' + total);
      sftp.end();
      conn.end();
    });
  });
}).connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'deploy_rsa.pem')),
  readyTimeout: 30000,
});

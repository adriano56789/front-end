const {Client} = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '2.25.192.154';
const PW = 'MshrUfZrh09hWr#';

function connect() {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('keyboard-interactive', (n,i,l,p,f) => f(p.map(() => PW)));
    c.on('ready', () => resolve(c));
    c.on('error', reject);
    c.connect({host:HOST, port:22, username:'root', password:PW, tryKeyboard:true, readyTimeout:30000, keepaliveInterval:15000});
  });
}

function exec(c, cmd, timeout=15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve('TIMEOUT'), timeout);
    c.exec(cmd, (e, r) => {
      if (e) { clearTimeout(t); return reject(e); }
      let d = '';
      r.on('data', d2 => d += d2);
      r.on('close', () => { clearTimeout(t); resolve(d); });
    });
  });
}

function sftpPut(c, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    c.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, {concurrency:1, chunkSize:64*1024*1024}, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  });
}

async function main() {
  const c = await connect();
  console.log('Connected!');

  // 1. Find and read the frontend nginx config
  const sites = await exec(c, 'ls /etc/nginx/sites-enabled/');
  console.log('Sites:', sites);

  // Find the frontend config (not api-livego-store)
  const siteFiles = sites.trim().split('\n').filter(Boolean);
  let frontendConfig = '';
  for (const f of siteFiles) {
    const content = await exec(c, `cat /etc/nginx/sites-enabled/${f}`);
    if (content.includes('livego.store') && !content.includes('api.livego.store')) {
      frontendConfig = content;
      console.log(`\n=== Frontend config: ${f} ===`);
      console.log(content);
      break;
    }
  }
  
  if (!frontendConfig) {
    // Try default config
    const defaultConfig = await exec(c, 'cat /etc/nginx/sites-enabled/default 2>/dev/null || cat /etc/nginx/conf.d/*.conf 2>/dev/null');
    console.log('\n=== Default config ===');
    console.log(defaultConfig);
  }

  c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });

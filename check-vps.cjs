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
    c.connect({host:HOST, port:22, username:'root', password:PW, tryKeyboard:true, readyTimeout:15000, keepaliveInterval:10000});
  });
}

function exec(c, cmd, timeout=10000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve('TIMEOUT'), timeout);
    c.exec(cmd, (e, r) => {
      let d = '';
      r.on('data', d2 => d += d2);
      r.on('close', () => { clearTimeout(t); resolve(d); });
    });
  });
}

async function main() {
  const c = await connect();
  console.log('=== Files on VPS ===');
  const files = await exec(c, 'ls -la /var/www/livego.store/assets/');
  console.log(files);
  
  console.log('=== index.html script tag ===');
  const html = await exec(c, 'grep -n "script.*index" /var/www/livego.store/index.html');
  console.log(html);
  
  console.log('=== nginx cache config ===');
  const nginx = await exec(c, 'cat /etc/nginx/sites-enabled/api-livego-store 2>/dev/null');
  // Find the main server block for livego.store
  const lines = nginx.split('\n');
  let inServer = false;
  let inLocation = false;
  for (const line of lines) {
    if (line.includes('server_name') && line.includes('livego')) inServer = true;
    if (inServer && (line.includes('expires') || line.includes('Cache-Control') || line.includes('add_header') || line.includes('location /') || line.includes('try_files'))) {
      console.log(line.trim());
    }
  }
  
  c.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });

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

function sshExec(c, cmd, timeout=15000) {
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

async function main() {
  const c = await connect();
  console.log('Connected!');

  const sftp = await new Promise((resolve, reject) => {
    c.sftp((err, sftp) => err ? reject(err) : resolve(sftp));
  });

  await sshExec(c, `mkdir -p ${WEBROOT}/assets`);

  // Upload root files
  const rootFiles = fs.readdirSync(DIST).filter(f => fs.statSync(path.join(DIST, f)).isFile());
  for (const f of rootFiles) {
    await sftpUpload(sftp, path.join(DIST, f), `${WEBROOT}/${f}`);
    console.log(`OK: ${f}`);
  }

  // Upload assets
  const assetsDir = path.join(DIST, 'assets');
  const newAssets = new Set(fs.readdirSync(assetsDir));
  for (const f of newAssets) {
    await sftpUpload(sftp, path.join(assetsDir, f), `${WEBROOT}/assets/${f}`);
    console.log(`OK: assets/${f}`);
  }

  // Delete old assets not in new build
  const oldAssets = (await sshExec(c, `ls ${WEBROOT}/assets/ 2>/dev/null`)).trim().split('\n').filter(Boolean);
  const toDelete = oldAssets.filter(a => !newAssets.has(a));
  if (toDelete.length > 0) {
    await sshExec(c, `rm -f ${toDelete.map(f => `${WEBROOT}/assets/${f}`).join(' ')}`);
    console.log(`Deleted ${toDelete.length} old assets`);
  }

  // Add no-cache headers for index.html in nginx
  const sitesList = await sshExec(c, 'ls /etc/nginx/sites-enabled/ 2>/dev/null || ls /etc/nginx/conf.d/ 2>/dev/null');
  console.log('\nSite configs:', sitesList.trim());

  // Find the frontend nginx config
  const siteFiles = sitesList.trim().split('\n').filter(Boolean);
  let patched = false;
  
  for (const sf of siteFiles) {
    const configPath = sf.includes('/') ? sf : `/etc/nginx/sites-enabled/${sf}`;
    const content = await sshExec(c, `cat ${configPath} 2>/dev/null`);
    
    // Skip api config
    if (content.includes('api.livego.store') && !content.includes('livego.store;')) continue;
    
    // This should be the frontend config
    if (content.includes('livego.store') || content.includes('location /')) {
      console.log(`\nFound frontend config: ${configPath}`);
      
      if (!content.includes('location = /index.html')) {
        // Insert a location = /index.html block before location /
        const cmd = `sed -i '/location \\/ {/i\\    # Never cache index.html\\n    location = /index.html {\\n        add_header Cache-Control "no-cache, no-store, must-revalidate" always;\\n        add_header Pragma "no-cache" always;\\n    }\\n' ${configPath}`;
        const r = await sshExec(c, cmd);
        console.log('sed:', r);
      } else {
        console.log('Already patched');
      }
      
      const test = await sshExec(c, 'nginx -t 2>&1');
      console.log('nginx test:', test);
      
      if (test.includes('successful')) {
        await sshExec(c, 'systemctl reload nginx 2>&1 || nginx -s reload 2>&1');
        console.log('nginx reloaded!');
      } else {
        console.log('ROLLING BACK');
        await sshExec(c, `sed -i '/Never cache index.html/,/}/d' ${configPath}`);
      }
      patched = true;
      break;
    }
  }
  
  if (!patched) console.log('Could not find frontend nginx config to patch');

  // Verify
  console.log('\n=== Verification ===');
  const html = await sshExec(c, `head -5 ${WEBROOT}/index.html && echo "---" && grep "script.*index" ${WEBROOT}/index.html`);
  console.log(html);
  
  const files = await sshExec(c, `ls -la ${WEBROOT}/assets/`);
  console.log(files);

  c.end();
  console.log('DONE');
}

main().catch(e => { console.error(e.message); process.exit(1); });

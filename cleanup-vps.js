const { Client } = require('ssh2');
const c = new Client();

const removed = [];

const run = (cmd) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { resolve('TIMEOUT'); }, 10000);
  c.exec(cmd, (err, stream) => {
    if (err) { clearTimeout(timer); return reject(err); }
    let out = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += d.toString(); });
    stream.on('close', () => { clearTimeout(timer); resolve(out.trim()); });
  });
});

async function main() {
  console.log('Connected. Scanning and cleaning up...');
  
  const targets = [
    { path: '/root/frontend-deploy/', label: 'old frontend Docker compose dir', isDir: true },
    { path: '/root/frontend-deploy.tar.gz', label: 'old frontend deploy tarball', isDir: false },
  ];

  // Glob-like: /tmp/*.tar.gz
  let tmpOut = await run('ls /tmp/*.tar.gz 2>/dev/null || true');
  if (tmpOut && tmpOut !== 'TIMEOUT' && !tmpOut.includes('No such file')) {
    tmpOut.split('\n').filter(Boolean).forEach(f => targets.push({ path: f, label: 'old /tmp tarball', isDir: false }));
  }

  // Glob-like: /root/*.tar.gz (excluding frontend-deploy.tar.gz)
  let rootOut = await run('ls /root/*.tar.gz 2>/dev/null || true');
  if (rootOut && rootOut !== 'TIMEOUT' && !rootOut.includes('No such file')) {
    rootOut.split('\n').filter(f => f && f !== '/root/frontend-deploy.tar.gz').forEach(f => targets.push({ path: f, label: 'root tarball', isDir: false }));
  }

  // .bak files in /app/
  let bakOut = await run('find /app/ -maxdepth 3 -name "*.bak" 2>/dev/null || true');
  if (bakOut && bakOut !== 'TIMEOUT' && !bakOut.includes('No such file')) {
    bakOut.split('\n').filter(Boolean).forEach(f => targets.push({ path: f, label: 'backup file', isDir: false }));
  }

  // setup-egress*.py
  let egOut = await run('find /app/ -maxdepth 3 -name "setup-egress*.py" 2>/dev/null || true');
  if (egOut && egOut !== 'TIMEOUT' && !egOut.includes('No such file')) {
    egOut.split('\n').filter(Boolean).forEach(f => targets.push({ path: f, label: 'egress setup script', isDir: false }));
  }

  // egress.yaml
  targets.push({ path: '/app/egress.yaml', label: 'egress yaml', isDir: false });

  // nginx backup configs
  let ngOut = await run('find /app/ -maxdepth 3 \\( -name "nginx*.bak*" -o -name "nginx*.old*" -o -name "nginx*.backup*" \\) 2>/dev/null || true');
  if (ngOut && ngOut !== 'TIMEOUT' && !ngOut.includes('No such file')) {
    ngOut.split('\n').filter(Boolean).forEach(f => targets.push({ path: f, label: 'nginx config backup', isDir: false }));
  }

  for (const t of targets) {
    const exists = await run(`test -e '${t.path}' && echo YES || echo NO`);
    if (exists === 'YES') {
      const rmCmd = t.isDir ? `rm -rf '${t.path}'` : `rm -f '${t.path}'`;
      await run(rmCmd);
      removed.push(`${t.isDir ? 'DIR' : 'FILE'} ${t.path} (${t.label})`);
    }
  }

  console.log(JSON.stringify(removed));
  c.end();
}

c.on('ready', () => main().catch(e => { console.error(e.message); c.end(); }))
  .on('error', (err) => { console.error('SSH_ERROR:' + err.message); })
  .on('keyboard-interactive', (n, i, il, prompts, finish) => finish(prompts.map(() => 'MshrUfZrh09hWr#')))
  .connect({ host: '2.25.192.154', port: 22, username: 'root', tryKeyboard: true, readyTimeout: 10000, connTimeout: 10000 });

setTimeout(() => process.exit(0), 30000);

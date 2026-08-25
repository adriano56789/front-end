const { Client } = require('ssh2');
const c = new Client();
const PASS = 'MshrUfZrh09hWr#';
// Compara hashes dos arquivos alterados hoje (backend) e checa versões no ar
const files = 'NotificationService.ts notificationRoutes.ts webPushService.ts chatRoutes.ts messageRoutes.ts server.ts payoneerService.ts giftRoutes.ts walletRoutes.ts withdrawalRoutes.ts env.ts';
const cmd =
  "cd /app/backend/src && md5sum " + files.split(' ').map(f => `services/${f} routes/${f} config/${f}`).join(' ') + " 2>/dev/null | sort -k2 | awk '{print $1, $2}'";
c.on('ready', () => {
  c.exec(cmd, (e, s) => {
    if (e) return console.log('EXEC ERR', e.message);
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log(o); console.log('===LOCAL==='); c.end(); });
  });
}).connect({ host: '2.25.192.154', port: 22, username: 'root', tryKeyboard: true, readyTimeout: 60000 })
  .on('keyboard-interactive', (n, i, il, p, f) => f(p.map(() => PASS)));
setTimeout(() => process.exit(0), 80000);

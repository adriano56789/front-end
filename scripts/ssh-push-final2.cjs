// Teste final: envia push real para o token registrado
const { Client } = require('ssh2');

const VPS_HOST = '2.25.192.154';
const VPS_USER = 'root';
const VPS_PASS = 'MshrUfZrh09hWr#';

const c = new Client();

const run = (cmd, t = 120000) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve('TIMEOUT'), t);
  c.exec(cmd, (err, stream) => {
    if (err) { clearTimeout(timer); resolve('EXEC_ERR: ' + err.message); return; }
    let out = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { out += d.toString(); });
    stream.on('close', () => { clearTimeout(timer); resolve(out.trim()); });
  });
});

async function main() {
  const token = (await run("docker exec app-mongodb mongosh --quiet api --eval 'const t=db.devicetokens.findOne(); print(t ? t.token : \"\")' 2>&1 | tail -1")).trim();
  if (!token) { console.log('NENHUM token registrado ainda'); c.end(); setTimeout(() => process.exit(0), 1000); return; }
  console.log('token:', token.substring(0, 20), '...');

  const script = `const f = require('/app/dist/services/firebaseService');
f.initFirebase();
f.sendPushNotification('${token}', { title: '💬 LiveGo', body: 'Teste do push do chat — funcionou!', data: { type: 'new_message', senderId: '1065527', senderName: 'adriano', text: 'Olá! Notificação do chat chegou 🎉', conversationId: 'chat_private_1065527_6771613' } })
  .then((r) => { console.log('PUSH_OK:', JSON.stringify(r)); process.exit(0); })
  .catch((e) => { console.log('PUSH_FAIL:', e.code, '|', e.message); process.exit(1); });
`;
  const b64 = Buffer.from(script).toString('base64');
  console.log(await run(`echo ${b64} | base64 -d > /tmp/push-final.cjs && docker cp /tmp/push-final.cjs app-backend:/tmp/push-final.cjs && docker exec -w /app app-backend node /tmp/push-final.cjs 2>&1 | head -6`));

  c.end();
  setTimeout(() => process.exit(0), 2000);
}
c.on('ready', () => main().catch((e) => { console.error('ERROR:', e.message); c.end(); setTimeout(() => process.exit(1), 1000); }))
  .on('error', (err) => { console.error('SSH_ERROR:', err.message); process.exit(1); })
  .on('keyboard-interactive', (n, i, il, prompts, finish) => finish(prompts.map(() => VPS_PASS)))
  .connect({ host: VPS_HOST, port: 22, username: VPS_USER, tryKeyboard: true, readyTimeout: 20000, connTimeout: 15000 });

setTimeout(() => process.exit(0), 120000);

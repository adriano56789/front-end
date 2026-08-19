// Envia push real para o token recém-registrado e verifica o resultado
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
  // Pega o userId do token registrado
  const info = (await run("docker exec app-mongodb mongosh --quiet api --eval 'const t=db.devicetokens.findOne(); print(t.userId)' 2>&1 | tail -1")).trim();
  console.log('userId com token:', info);

  // Monta script de teste no servidor (base64 para evitar escaping)
  const token = (await run("docker exec app-mongodb mongosh --quiet api --eval 'const t=db.devicetokens.findOne(); print(t.token)' 2>&1 | tail -1")).trim();
  const script = `const f = require('/app/dist/services/firebaseService');
f.initFirebase();
f.sendPushNotification('${token}', { title: '🔔 LiveGo', body: 'Notificação de teste — o push do chat está funcionando!', data: { type: 'new_message', from: '1065527', senderId: '1065527', senderName: 'adriano', text: 'teste', conversationId: 'teste' } })
  .then((r) => { console.log('SUCCESS:', JSON.stringify(r)); process.exit(0); })
  .catch((e) => { console.log('FAIL code:', e.code, '| msg:', e.message); process.exit(1); });
`;
  const b64 = Buffer.from(script).toString('base64');
  console.log(await run(`echo ${b64} | base64 -d > /tmp/push-verify.cjs && docker cp /tmp/push-verify.cjs app-backend:/tmp/push-verify.cjs && docker exec -w /app app-backend node /tmp/push-verify.cjs 2>&1 | head -6`));

  c.end();
  setTimeout(() => process.exit(0), 2000);
}
c.on('ready', () => main().catch((e) => { console.error('ERROR:', e.message); c.end(); setTimeout(() => process.exit(1), 1000); }))
  .on('error', (err) => { console.error('SSH_ERROR:', err.message); process.exit(1); })
  .on('keyboard-interactive', (n, i, il, prompts, finish) => finish(prompts.map(() => VPS_PASS)))
  .connect({ host: VPS_HOST, port: 22, username: VPS_USER, tryKeyboard: true, readyTimeout: 20000, connTimeout: 15000 });

setTimeout(() => process.exit(0), 120000);

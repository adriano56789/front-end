// Verifica VAPID no bundle e testa push
const { Client } = require('ssh2');

const VPS_HOST = '2.25.192.154';
const VPS_USER = 'root';
const VPS_PASS = 'MshrUfZrh09hWr#';

const c = new Client();

const run = (cmd, t = 60000) => new Promise((resolve) => {
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
  const bundle = (await run("curl -s https://livego.store/ | grep -o 'index-[A-Za-z0-9_-]*\\.js' | head -1")).trim();
  console.log('bundle:', bundle);

  console.log('\n--- bundle tem a VAPID key? ---');
  console.log(await run("curl -s https://livego.store/assets/" + bundle + " | grep -c 'BJamjvLU2QconKZHYCXSuhkd8lvSIP0vfe4Psuxp_IywVMdQ_cT1JJGtfmRFpovU_iKqLN9kPBr01g5sUKoDzoY'"));

  console.log('\n--- tokens re-registrados no banco? ---');
  console.log(await run("docker exec app-mongodb mongosh --quiet api --eval 'print(\"count:\", db.devicetokens.countDocuments())' 2>&1 | tail -1"));

  console.log('\n--- testar envio p/ um token real se existir ---');
  console.log(await run("docker exec app-mongodb mongosh --quiet api --eval 'const t=db.devicetokens.findOne(); print(t ? t.token.substring(0,20) + \" (len \" + t.token.length + \")\" : \"NENHUM\")' 2>&1 | tail -1"));

  console.log('\n--- backend health ---');
  console.log(await run("curl -s -o /dev/null -w '%{http_code}' https://livego.store/api/health"));

  c.end();
  setTimeout(() => process.exit(0), 2000);
}
c.on('ready', () => main().catch((e) => { console.error('ERROR:', e.message); c.end(); setTimeout(() => process.exit(1), 1000); }))
  .on('error', (err) => { console.error('SSH_ERROR:', err.message); process.exit(1); })
  .on('keyboard-interactive', (n, i, il, prompts, finish) => finish(prompts.map(() => VPS_PASS)))
  .connect({ host: VPS_HOST, port: 22, username: VPS_USER, tryKeyboard: true, readyTimeout: 20000, connTimeout: 15000 });

setTimeout(() => process.exit(0), 120000);

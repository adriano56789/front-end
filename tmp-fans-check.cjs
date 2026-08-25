const { Client } = require('ssh2');
const conn = new Client();
const cmd = `docker exec app-backend node -e "
const http = require('http');
function req(path, method, body, token) {
  return new Promise((res, rej) => {
    const r = http.request({ host: 'localhost', port: 3000, path, method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}) }, (resp) => {
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => res(d));
    });
    r.on('error', rej);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
(async () => {
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/api');
  const db = mongoose.connection.db;
  // top 3 usuários que MAIS RECEBERAM presentes (fãs de verdade existem pra eles)
  const top = await db.collection('gifttransactions').aggregate([
    { \\$group: { _id: '\\$toUserId', total: { \\$sum: '\\$totalValue' }, n: { \\$sum: 1 } } },
    { \\$sort: { total: -1 } }, { \\$limit: 3 }
  ]).toArray();
  console.log('TOP_RECEBEDORES:', JSON.stringify(top));
  const login = await req('/api/auth/login', 'POST', { email: 'qa.refresh@livego.store', password: 'QaRefresh123' });
  const lj = JSON.parse(login);
  const token = lj.token || (lj.user && lj.user.token);
  console.log('LOGIN_OK:', !!token);
  for (const t of top) {
    const r = await req('/api/ranking/monthly?userId=' + t._id + '&scope=fans&_t=' + Date.now(), 'GET', null, token);
    let arr = []; try { arr = JSON.parse(r); } catch(e) { arr = [{ parseError: r.slice(0,120) }]; }
    console.log('FANS_DE', t._id, '(esperado', t.n, 'remetentes):', arr.length, '→', arr.slice(0,3).map(f => ({ nome: f.name, contrib: f.contribution, src: f.debug && f.debug.source })));
  }
  // e a Dudaa (sem fãs):
  const rd = await req('/api/ranking/monthly?userId=1758193&scope=fans&_t=' + Date.now(), 'GET', null, token);
  console.log('FANS_DA_DUDAA:', JSON.parse(rd).length, '(esperado 0)');
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
"`;
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error('EXEC_ERR', err.message); return conn.end(); }
    let out = '';
    stream.on('close', () => { console.log(out); conn.end(); })
          .on('data', d => out += d.toString())
          .stderr.on('data', d => out += d.toString());
  });
}).connect({
  host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#',
  tryKeyboard: true, readyTimeout: 45000,
});
conn.on('keyboard-interactive', (_, __, ___, ____, finish) => finish([conn.config.password]));

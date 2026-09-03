const { Client } = require('ssh2');

const PASSWORD = 'MshrUfZrh09hWr#';
const HOST = '2.25.192.154';

function connect(attempt = 1) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('keyboard-interactive', (n, i, l, p, f) => f([PASSWORD]));
    conn.on('ready', () => resolve(conn));
    conn.on('error', (e) => {
      if (attempt < 25) {
        console.log(`  handshake falhou (${e.code || e.message}), tentativa ${attempt + 1}/25...`);
        setTimeout(() => connect(attempt + 1).then(resolve, reject), 1500);
      } else reject(new Error('SSH_FAILED: ' + e.message));
    });
    conn.connect({ host: HOST, port: 22, username: 'root', password: PASSWORD, tryKeyboard: true, readyTimeout: 15000, keepaliveInterval: 10000 });
  });
}
function sshExec(conn, cmd, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const guard = setTimeout(() => { if (!done) { done = true; reject(new Error('timeout')); } }, timeoutMs);
    conn.exec(cmd, (err, stream) => {
      if (err) { done = true; clearTimeout(guard); reject(err); return; }
      let out = '';
      stream.on('data', d => { out += d.toString(); });
      stream.stderr.on('data', d => { out += d.toString(); });
      stream.on('close', (code) => { if (!done) { done = true; clearTimeout(guard); resolve({ code, out }); } });
    });
  });
}

async function main() {
  const js = `
    (async()=>{
      const mongoose=require('mongoose');
      await mongoose.connect('mongodb://livego_admin:ce0d61d0277da7031e11c97b66a775f01ab0f0bfbe443108@mongodb:27017/api?authSource=admin', {serverSelectionTimeoutMS:10000});
      const db=mongoose.connection.db;
      const duda=await db.collection('users').find({$or:[{name:/duda/i},{displayName:/duda/i},{id:/duda/i}]}).limit(10).toArray();
      console.log('DUDA_COUNT='+duda.length);
      for(const u of duda.slice(0,5)){
        console.log(JSON.stringify({id:u.id,name:u.name,displayName:u.displayName,identification:u.identification,avatar:u.avatar,avatarUrl:u.avatarUrl,photos:(u.photos||[]).length,coverUrl:u.coverUrl}));
      }
      // amostra geral de avatares vazios
      const emptyAv=await db.collection('users').countDocuments({$or:[{avatarUrl:{$in:[null,'']}},{avatarUrl:{$exists:false}}]});
      console.log('EMPTY_AVATAR_COUNT='+emptyAv);
      // de onde vêm as URLs de avatar? amostra 5 distintos hosts
      const avSamples=await db.collection('users').aggregate([{$match:{avatarUrl:{$ne:''}}},{$sample:{size:8}},{$project:{avatarUrl:1}}]).toArray();
      console.log('AV_SAMPLES='+JSON.stringify(avSamples.map(a=>a.avatarUrl).slice(0,8)));
      await mongoose.disconnect();
    })().catch(e=>console.log('ERR',e.message));
  `;
  const b64 = Buffer.from(js, 'utf8').toString('base64');
  const conn = await connect();
  console.log('Connected!');
  try {
    const cmd = 'echo ' + b64 + ' | base64 -d | docker exec -i app-backend node -e "let s=\'\';process.stdin.on(\'data\',d=>s+=d);process.stdin.on(\'end\',()=>eval(s))"';
    const r = await sshExec(conn, cmd, 90000);
    console.log('=== mongo duda ===\n' + r.out);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
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
      const q={avatarUrl:{$ne:''},$or:[{avatar:''},{avatar:{$in:[null]}},{avatar:{$exists:false}}]};
      const before=await db.collection('users').countDocuments(q);
      console.log('AVATAR_EMPTY_BUT_URL='+before);
      const upd=await db.collection('users').updateMany(q,[{$set:{avatar:'$avatarUrl'}}]);
      console.log('UPDATED='+upd.modifiedCount);
      const duda=await db.collection('users').findOne({id:'1758193'},{projection:{id:1,avatar:1,avatarUrl:1}});
      console.log('DUDA_NOW='+JSON.stringify(duda));
      const emptyNow=await db.collection('users').countDocuments({$or:[{avatar:{$in:[null,'']}},{avatar:{$exists:false}}]});
      console.log('EMPTY_AVATAR_NOW='+emptyNow);
      await mongoose.disconnect();
    })().catch(e=>console.log('ERR',e.message));
  `;
  const b64 = Buffer.from(js, 'utf8').toString('base64');
  const conn = await connect();
  console.log('Connected!');
  try {
    const cmd = 'echo ' + b64 + ' | base64 -d | docker exec -i app-backend node -e "let s=\'\';process.stdin.on(\'data\',d=>s+=d);process.stdin.on(\'end\',()=>eval(s))"';
    const r = await sshExec(conn, cmd, 90000);
    console.log('=== mongo avatar fix ===\n' + r.out);
  } catch (e) {
    console.log('SINGLE-FAIL', e.message);
  } finally {
    conn.end();
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const script = [
    "const M=require('mongoose');",
    '(async()=>{',
    "await M.connect(process.env.MONGODB_URI,{dbName:'api'});",
    'const col=M.connection.db.collection("users");',
    "const u=await col.findOne({id:'1758193'});",
    "const correta=(u.obras&&u.obras[0]&&u.obras[0].url)||'';",
    "console.log('avatar atual:',u.avatarUrl);",
    "console.log('url correta:',correta);",
    'if(correta.indexOf("http")===0){',
    '  const S=String.fromCharCode(36);',
    '  const upd={}; upd[S+"set"]={avatarUrl:correta};',
    "  await col.updateOne({_id:u._id},upd);",
    "  console.log('CORRIGIDO');",
    '} else { console.log("sem url de obra valida!"); }',
    "console.log('=== outros com avatarUrl quebrado:');",
    "const todos=await col.find({},{projection:{id:1,name:1,avatarUrl:1,obras:1}}).toArray();",
    'for(const x of todos){',
    '  const a=x.avatarUrl||"";',
    '  if(a && a.indexOf("http")!==0){',
    '    const fix=(x.obras&&x.obras[0]&&x.obras[0].url&&String(x.obras[0].url).indexOf("http")===0)?x.obras[0].url:null;',
    '    if(fix){ const S2=String.fromCharCode(36); const up={}; up[S2+"set"]={avatarUrl:fix}; await col.updateOne({_id:x._id},up); }',
    '    console.log("-",x.id,"|",x.name,"| avatar=",a,"|",fix?("corrigido->"+fix):"SEM FONTE");',
    '  }',
    '}',
    "console.log('fim verificacao');",
    'await M.disconnect();',
    '})().catch(e=>{console.error(e.message);process.exit(1);})'
  ].join('');
  const cmd = `docker exec app-backend node -e "${script.replace(/"/g, '\\"')}"`;
  c.exec(cmd, (err, stream) => {
    if (err) { console.error('EXEC_ERR:', err.message); process.exit(1); }
    let out = '';
    stream.on('data', d => out += d.toString());
    stream.stderr.on('data', d => out += d.toString());
    stream.on('close', () => { console.log(out.trim()); c.end(); setTimeout(() => process.exit(0), 800); });
  });
})
  .on('error', e => { console.error('SSH_ERROR:', e.message); process.exit(1); })
  .on('keyboard-interactive', (n,i,il,p,f) => f(p.map(() => 'MshrUfZrh09hWr#')))
  .connect({ host: '2.25.192.154', port: 22, username: 'root', tryKeyboard: true, readyTimeout: 60000 });
setTimeout(() => process.exit(0), 90000);

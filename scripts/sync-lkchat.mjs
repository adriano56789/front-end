import { Client } from 'ssh2';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const VPS_PASS = 'MshrUfZrh09hWr#';
const BE_VPS = '/app/backend';
const FE_VPS = '/app/frontend';
const BE_LOCAL = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\backend';
const FE_LOCAL = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\front-end';

const KEYWORDS = ['useLiveKitChat','LiveKitChat','lkChat','livekit_chat','lkRoom','LiveKit Chat','live-message','livekit/chat'];

const conn = new Client();
conn.on('keyboard-interactive', (n,i,l,p,f) => f([VPS_PASS]));

await new Promise((ok,err) => {
  conn.on('ready', ok);
  conn.on('error', err);
  conn.connect({host:'2.25.192.154',port:22,username:'root',password:VPS_PASS,readyTimeout:15000,tryKeyboard:true});
});

console.log('✅ Conectado!\n');

function exec(cmd) {
  return new Promise((res,rej) => {
    conn.exec(cmd, (e,st) => {
      if (e) return rej(e);
      let out='',err='';
      st.on('data',d=>out+=d.toString());
      st.stderr.on('data',d=>err+=d.toString());
      st.on('close',()=>res({out,err}));
    });
  });
}

// Search for LiveKit Chat files on VPS by content
console.log('🔍 Buscando arquivos com código LiveKit Chat na VPS...\n');

const searchPattern = KEYWORDS.map(k => `-e "${k}"`).join(' ');
const searchCmd = `grep -rl ${searchPattern} --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" ${BE_VPS}/src ${FE_VPS}/components ${FE_VPS}/hooks ${FE_VPS}/services ${FE_VPS}/src ${FE_VPS}/utils 2>/dev/null | sort`;

const r = await exec(searchCmd);
const files = r.out.split('\n').filter(f => f.trim());

console.log(`📋 ${files.length} arquivos encontrados com código LiveKit Chat:\n`);
files.forEach(f => console.log(`   ${f}`));

// Copy all found files
if (files.length === 0) {
  console.log('\n⚠️  Nenhum arquivo encontrado com os padrões de busca.');
  conn.end();
  process.exit(1);
}

const sftp = await new Promise((ok,err) => conn.sftp((e,s)=>e?err(e):ok(s)));
const rFile = (p) => new Promise((ok,err) => sftp.readFile(p,(e,b)=>e?err(e):ok(b)));

let copied = 0;
let identical = 0;

for (const vpsPath of files) {
  let localPath;
  if (vpsPath.startsWith(BE_VPS)) localPath = join(BE_LOCAL, vpsPath.slice(BE_VPS.length+1));
  else if (vpsPath.startsWith(FE_VPS)) localPath = join(FE_LOCAL, vpsPath.slice(FE_VPS.length+1));
  else continue;

  try {
    const data = await rFile(vpsPath);
    const dir = dirname(localPath);
    if (!existsSync(dir)) mkdirSync(dir, {recursive:true});

    if (existsSync(localPath)) {
      const localContent = readFileSync(localPath);
      if (localContent.equals(data)) {
        identical++;
        continue; // Skip if identical
      }
      writeFileSync(localPath+'.bak', localContent);
    }

    writeFileSync(localPath, data);
    console.log(`   ✅ Copiado: ${vpsPath.replace(BE_VPS,'').replace(FE_VPS,'')}`);
    copied++;
  } catch(e) {
    console.log(`   ⚠️  Erro em ${vpsPath}: ${e.message}`);
  }
}

sftp.end();
conn.end();

console.log(`\n📊 Resultado: ${copied} copiados, ${identical} já estavam idênticos`);
console.log('✅ Sincronização LiveKit Chat concluída!');

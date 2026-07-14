import { Client } from 'ssh2';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VPS_PASS = 'MshrUfZrh09hWr#';

const BACKEND_VPS = '/app/backend';
const FRONTEND_VPS = '/app/frontend';
const BACKEND_LOCAL = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\backend';
const FRONTEND_LOCAL = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\front-end';

// Files to sync
const filesToSync = [
  { vps: `${BACKEND_VPS}/src/routes/liveRoutes.ts`, local: join(BACKEND_LOCAL, 'src/routes/liveRoutes.ts'), label: 'Backend: src/routes/liveRoutes.ts' },
  { vps: `${FRONTEND_VPS}/components/StreamRoom.tsx`, local: join(FRONTEND_LOCAL, 'components/StreamRoom.tsx'), label: 'Frontend: components/StreamRoom.tsx' },
];

const conn = new Client();

conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
  finish([VPS_PASS]);
});

console.log('🔌 Conectando à VPS...\n');

await new Promise((resolve, reject) => {
  conn.on('ready', resolve);
  conn.on('error', reject);
  conn.connect({
    host: '2.25.192.154', port: 22, username: 'root',
    password: VPS_PASS, readyTimeout: 15000, tryKeyboard: true,
  });
});

console.log('✅ Conectado!\n');

const sftp = await new Promise((resolve, reject) => {
  conn.sftp((err, sftp) => err ? reject(err) : resolve(sftp));
});

const readFile = (path) => new Promise((resolve, reject) => {
  sftp.readFile(path, (err, buf) => err ? reject(err) : resolve(buf));
});

for (const file of filesToSync) {
  try {
    console.log(`📥 Baixando ${file.label}...`);
    
    // Backup local first
    if (existsSync(file.local)) {
      const backupPath = file.local + '.bak';
      const localContent = readFileSync(file.local, 'utf-8');
      writeFileSync(backupPath, localContent);
      console.log(`   💾 Backup criado: ${file.label}.bak`);
    }

    // Create dir if needed
    const localDir = dirname(file.local);
    if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });

    // Download from VPS
    const data = await readFile(file.vps);
    writeFileSync(file.local, data);
    
    const lines = data.toString().split('\n').length;
    console.log(`   ✅ Copiado! (${lines} linhas)`);

  } catch (err) {
    console.log(`   ❌ Erro: ${err.message}`);
  }
}

sftp.end();
conn.end();
console.log('\n✅ Sincronização concluída!');
console.log('\n📌 Backups salvos como .bak (ao lado dos originais)');

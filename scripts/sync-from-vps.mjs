import { Client } from 'ssh2';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VPS_HOST = '2.25.192.154';
const VPS_USER = 'root';
const VPS_PASS = 'MshrUfZrh09hWr#';

const BACKEND_VPS = '/app/backend';
const FRONTEND_VPS = '/app/frontend';
const BACKEND_LOCAL = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\backend';
const FRONTEND_LOCAL = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\front-end';

function execCmd(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '', stderr = '';
      stream.on('data', (d) => stdout += d.toString());
      stream.stderr.on('data', (d) => stderr += d.toString());
      stream.on('close', () => resolve({ stdout, stderr }));
    });
  });
}

function isSourceFile(f) {
  const lower = f.toLowerCase().trim();
  if (!lower) return false;
  return !lower.includes('node_modules') &&
         !lower.startsWith('dist/') &&
         !lower.startsWith('build/') &&
         !lower.endsWith('.bak') &&
         !lower.endsWith('.log') &&
         !lower.includes('package-lock') &&
         !lower.includes('.env') &&
         !lower.startsWith('uploads/') &&
         !lower.endsWith('.tar') &&
         !lower.endsWith('.tar.gz') &&
         !lower.endsWith('.zip') &&
         !lower.startsWith('.git');
}

async function main() {
  console.log('🔌 Conectando à VPS...\n');

  const conn = new Client();

  conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
    finish([VPS_PASS]);
  });

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect({
      host: VPS_HOST,
      port: 22,
      username: VPS_USER,
      password: VPS_PASS,
      readyTimeout: 15000,
      tryKeyboard: true,
    });
  });

  console.log('✅ Conectado! Host:', VPS_HOST, '\n');

  try {
    // ============ BACKEND ============
    console.log('=== 📁 BACKEND (/app/backend) ===');
    
    const beLog = await execCmd(conn, `cd ${BACKEND_VPS} && git log --oneline -5`);
    console.log('Últimos commits:\n' + beLog.stdout);
    
    const beStatus = await execCmd(conn, `cd ${BACKEND_VPS} && git status --short`);
    console.log('\nStatus:\n' + (beStatus.stdout || '(limpo)'));
    
    const beChanged = await execCmd(conn, `cd ${BACKEND_VPS} && git diff --name-only && echo \"---\" && git diff --cached --name-only && echo \"---UNTRACKED---\" && git ls-files --others --exclude-standard`);
    const beFiles = beChanged.stdout.split('\n').filter(f => f.trim() && !f.startsWith('---'));
    
    const beDiffs = await execCmd(conn, `cd ${BACKEND_VPS} && git diff --stat && echo \"---STAGED---\" && git diff --cached --stat`);
    console.log('\nArquivos com diff real:\n' + (beDiffs.stdout || '(nenhum)'));

    // ============ FRONTEND ============
    console.log('\n=== 📁 FRONTEND (/app/frontend) ===');
    
    const feLog = await execCmd(conn, `cd ${FRONTEND_VPS} && git log --oneline -5`);
    console.log('Últimos commits:\n' + feLog.stdout);
    
    const feStatus = await execCmd(conn, `cd ${FRONTEND_VPS} && git status --short`);
    console.log('\nStatus:\n' + (feStatus.stdout || '(limpo)'));
    
    const feChanged = await execCmd(conn, `cd ${FRONTEND_VPS} && git diff --name-only && echo \"---\" && git diff --cached --name-only && echo \"---UNTRACKED---\" && git ls-files --others --exclude-standard`);
    const feFiles = feChanged.stdout.split('\n').filter(f => f.trim() && !f.startsWith('---'));
    
    const feDiffs = await execCmd(conn, `cd ${FRONTEND_VPS} && git diff --stat && echo \"---STAGED---\" && git diff --cached --stat`);
    console.log('\nArquivos com diff real:\n' + (feDiffs.stdout || '(nenhum)'));

    // ============ FILTRAR ARQUIVOS-FONTE ============
    const beSourceFiles = beFiles.filter(isSourceFile);
    const feSourceFiles = feFiles.filter(isSourceFile);

    console.log('\n📋 Backend - arquivos-fonte para sincronizar:');
    beSourceFiles.forEach(f => console.log(`   ${f}`));
    
    console.log('\n📋 Frontend - arquivos-fonte para sincronizar:');
    feSourceFiles.forEach(f => console.log(`   ${f}`));

    // ============ COPIAR ARQUIVOS VIA SFTP ============
    if (beSourceFiles.length === 0 && feSourceFiles.length === 0) {
      console.log('\n✅ Nenhum arquivo-fonte para sincronizar.');
      conn.end();
      process.exit(0);
    }

    console.log('\n🔄 Iniciando cópia dos arquivos...\n');

    const sftp = await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => err ? reject(err) : resolve(sftp));
    });

    const readFile = (path) => new Promise((resolve, reject) => {
      sftp.readFile(path, (err, buf) => err ? reject(err) : resolve(buf));
    });

    // Backend
    for (const file of beSourceFiles) {
      try {
        const vpsPath = `${BACKEND_VPS}/${file}`;
        const localPath = join(BACKEND_LOCAL, file.replace(/\\/g, '/'));
        const localDir = dirname(localPath);
        if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
        const data = await readFile(vpsPath);
        writeFileSync(localPath, data);
        console.log(`   ✅ Backend: ${file}`);
      } catch (err) {
        console.log(`   ⚠️  Backend: ${file} - ${err.message}`);
      }
    }

    // Frontend
    for (const file of feSourceFiles) {
      try {
        const vpsPath = `${FRONTEND_VPS}/${file}`;
        const localPath = join(FRONTEND_LOCAL, file.replace(/\\/g, '/'));
        const localDir = dirname(localPath);
        if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
        const data = await readFile(vpsPath);
        writeFileSync(localPath, data);
        console.log(`   ✅ Frontend: ${file}`);
      } catch (err) {
        console.log(`   ⚠️  Frontend: ${file} - ${err.message}`);
      }
    }

    sftp.end();
    console.log('\n✅ Sincronização concluída com sucesso!');

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    conn.end();
    process.exit(0);
  }
}

main();

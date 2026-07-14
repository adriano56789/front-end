import { Client } from 'ssh2';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
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
         !lower.startsWith('.git') &&
         !lower.includes('mongod.log');
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
      host: VPS_HOST, port: 22, username: VPS_USER,
      password: VPS_PASS, readyTimeout: 15000, tryKeyboard: true,
    });
  });

  console.log('✅ Conectado!\n');

  try {
    // ============ VERIFICAÇÃO DETALHADA BACKEND ============
    console.log('=== 📁 BACKEND - VERIFICAÇÃO DETALHADA ===\n');

    // 1. Git log
    const beLog = await execCmd(conn, `cd ${BACKEND_VPS} && git log --oneline -10`);
    console.log('Últimos 10 commits:\n' + beLog.stdout + '\n');

    // 2. All changes (staged + unstaged + untracked)
    const beStatus = await execCmd(conn, `cd ${BACKEND_VPS} && git status --short`);
    console.log('Git status:\n' + (beStatus.stdout || '(limpo)') + '\n');

    // 3. Unstaged changes (working tree vs index)
    const beUnstaged = await execCmd(conn, `cd ${BACKEND_VPS} && git diff --name-only`);
    console.log('Unstaged (working tree vs index):\n' + (beUnstaged.stdout || '(nenhum)') + '\n');

    // 4. Staged changes 
    const beStaged = await execCmd(conn, `cd ${BACKEND_VPS} && git diff --cached --name-only`);
    console.log('Staged (index vs HEAD):\n' + (beStaged.stdout || '(nenhum)') + '\n');

    // 5. Untracked source files
    const beUntracked = await execCmd(conn, `cd ${BACKEND_VPS} && git ls-files --others --exclude-standard`);
    const beUntrackedSrc = beUntracked.stdout.split('\n').filter(isSourceFile);
    if (beUntrackedSrc.length > 0) {
      console.log('Untracked SOURCE files:');
      beUntrackedSrc.forEach(f => console.log(`   ${f}`));
      console.log();
    }

    // 6. Files modified in last 7 days (find command)
    const beRecent = await execCmd(conn, `find ${BACKEND_VPS}/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" | xargs ls -lt 2>/dev/null | head -30`);
    console.log('Arquivos .ts/.tsx/.js mais recentes (src/):\n' + (beRecent.stdout || '(nenhum)') + '\n');

    // 7. Check specific key files for diff with local
    const keyBackendFiles = [
      'src/server.ts',
      'src/socket.ts',
      'src/services/LiveKitTokenService.ts',
      'src/services/NewUserNotificationService.ts',
      'src/services/PresenceService.ts',
      'src/routes/liveRoutes.ts',
      'src/routes/livekitRoutes.ts',
      'src/routes/chatRoutes.ts',
      'src/routes/giftRoutes.ts',
    ];

    console.log('=== Verificando arquivos-chave do backend ===\n');
    for (const file of keyBackendFiles) {
      const localPath = join(BACKEND_LOCAL, file);
      const vpsContent = await execCmd(conn, `cat ${BACKEND_VPS}/${file} 2>/dev/null || echo "NOT_FOUND"`);
      if (vpsContent.stdout.trim() === 'NOT_FOUND') {
        console.log(`   ⚠️  ${file} - não encontrado na VPS`);
        continue;
      }
      if (existsSync(localPath)) {
        const localContent = readFileSync(localPath, 'utf-8');
        if (localContent !== vpsContent.stdout) {
          console.log(`   🔴 ${file} - DIFERENTE! (local vs VPS)`);
          const linesLocal = localContent.split('\n').length;
          const linesVps = vpsContent.stdout.split('\n').length;
          console.log(`      Linhas: local=${linesLocal}, vps=${linesVps}`);
        } else {
          console.log(`   ✅ ${file} - igual`);
        }
      } else {
        console.log(`   🆕 ${file} - NOVO na VPS (não existe local)`);
      }
    }

    // ============ VERIFICAÇÃO DETALHADA FRONTEND ============
    console.log('\n=== 📁 FRONTEND - VERIFICAÇÃO DETALHADA ===\n');

    const feLog = await execCmd(conn, `cd ${FRONTEND_VPS} && git log --oneline -10`);
    console.log('Últimos 10 commits:\n' + feLog.stdout + '\n');

    const feStatus = await execCmd(conn, `cd ${FRONTEND_VPS} && git status --short`);
    console.log('Git status:\n' + (feStatus.stdout || '(limpo)') + '\n');

    const feUnstaged = await execCmd(conn, `cd ${FRONTEND_VPS} && git diff --name-only`);
    console.log('Unstaged:\n' + (feUnstaged.stdout || '(nenhum)') + '\n');

    const feStaged = await execCmd(conn, `cd ${FRONTEND_VPS} && git diff --cached --name-only`);
    console.log('Staged:\n' + (feStaged.stdout || '(nenhum)') + '\n');

    const feUntracked = await execCmd(conn, `cd ${FRONTEND_VPS} && git ls-files --others --exclude-standard`);
    const feUntrackedSrc = feUntracked.stdout.split('\n').filter(isSourceFile);
    if (feUntrackedSrc.length > 0) {
      console.log('Untracked SOURCE files:');
      feUntrackedSrc.forEach(f => console.log(`   ${f}`));
      console.log();
    }

    const feRecent = await execCmd(conn, `find ${FRONTEND_VPS}/components ${FRONTEND_VPS}/hooks ${FRONTEND_VPS}/services ${FRONTEND_VPS}/src -name "*.ts" -o -name "*.tsx" | xargs ls -lt 2>/dev/null | head -30`);
    console.log('Arquivos .ts/.tsx mais recentes:\n' + (feRecent.stdout || '(nenhum)') + '\n');

    const keyFrontendFiles = [
      'components/StreamRoom.tsx',
      'services/api.ts',
      'services/socket.ts',
      'services/livekit/livekitApi.ts',
      'hooks/useLiveKit.ts',
      'hooks/useLiveKitChat.ts',
      'src/components/StreamRoom.tsx',
    ];

    console.log('=== Verificando arquivos-chave do frontend ===\n');
    for (const file of keyFrontendFiles) {
      const localPath = join(FRONTEND_LOCAL, file);
      const vpsContent = await execCmd(conn, `cat ${FRONTEND_VPS}/${file} 2>/dev/null || echo "NOT_FOUND"`);
      if (vpsContent.stdout.trim() === 'NOT_FOUND') {
        console.log(`   ⚠️  ${file} - não encontrado na VPS`);
        continue;
      }
      if (existsSync(localPath)) {
        const localContent = readFileSync(localPath, 'utf-8');
        if (localContent !== vpsContent.stdout) {
          console.log(`   🔴 ${file} - DIFERENTE! (local vs VPS)`);
          const linesLocal = localContent.split('\n').length;
          const linesVps = vpsContent.stdout.split('\n').length;
          console.log(`      Linhas: local=${linesLocal}, vps=${linesVps}`);
        } else {
          console.log(`   ✅ ${file} - igual`);
        }
      } else {
        console.log(`   🆕 ${file} - NOVO na VPS (não existe local)`);
      }
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    conn.end();
    process.exit(0);
  }
}

main();

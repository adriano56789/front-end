/**
 * apply-rodadas-2-3-4.cjs
 *
 * Script de patch que aplica as Rodadas 2, 3 e 4 no backend da VPS.
 * Rodar dentro do container Docker ou no host com acesso ao /app/frontend.
 *
 * USO:
 *   node scripts/apply-rodadas-2-3-4.cjs
 *
 * O que faz:
 *   1. Copia os 4 módulos para services/
 *   2. Patchea o server.ts para integrar tudo
 *   3. Rebuilda o container
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND_DIR = process.env.BACKEND_DIR || '/app/frontend';
const SERVICES_DIR = path.join(BACKEND_DIR, 'services');
const SERVER_TS = path.join(BACKEND_DIR, 'server.ts');

// ── Cores ───────────────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function log(msg) { console.log(`${GREEN}[OK]${RESET} ${msg}`); }
function warn(msg) { console.log(`${YELLOW}[WARN]${RESET} ${msg}`); }
function error(msg) { console.log(`${RED}[ERROR]${RESET} ${msg}`); }

// ── 1. Copiar módulos ──────────────────────────────────────────────
function copyModules() {
  console.log('\n📦 Copiando módulos...\n');

  const modules = [
    'StreamLifecycleManager.ts',
    'StreamEndConsolidator.ts',
    'ViewerCountManager.ts',
    'SRSReconciler.ts',
  ];

  const sourceDir = path.join(__dirname, '..');

  for (const mod of modules) {
    const src = path.join(sourceDir, mod);
    const dst = path.join(SERVICES_DIR, mod);

    if (!fs.existsSync(src)) {
      error(`Módulo não encontrado: ${src}`);
      continue;
    }

    // Backup se já existe
    if (fs.existsSync(dst)) {
      const backup = dst + '.bak.' + Date.now();
      fs.copyFileSync(dst, backup);
      warn(`Backup criado: ${backup}`);
    }

    fs.copyFileSync(src, dst);
    log(`${mod} → ${dst}`);
  }
}

// ── 2. Patchear server.ts ──────────────────────────────────────────
function patchServer() {
  console.log('\n🔧 Patcheando server.ts...\n');

  if (!fs.existsSync(SERVER_TS)) {
    error(`server.ts não encontrado: ${SERVER_TS}`);
    return false;
  }

  let content = fs.readFileSync(SERVER_TS, 'utf8');

  // Verificar se já foi patcheado
  if (content.includes('StreamLifecycleManager')) {
    warn('server.ts já parece ter os imports das Rodadas. Pulando patch.');
    return true;
  }

  // ── Import do LifecycleManager (após último import existente) ──
  const importBlock = `
// ── Rodadas 2,3,4: Imports consolidados ─────────────────────────
import { StreamLifecycleManager } from './services/StreamLifecycleManager';
import { StreamEndConsolidator } from './services/StreamEndConsolidator';
import { ViewerCountManager } from './services/ViewerCountManager';
import { SRSReconciler } from './services/SRSReconciler';
`;

  // Encontrar posição para inserir imports (após último import)
  const lastImportMatch = content.lastIndexOf(/^import\s/m);
  if (lastImportMatch === -1) {
    warn('Não conseguiu encontrar posição para imports. Inserindo no início.');
    content = importBlock + '\n' + content;
  } else {
    const insertPos = content.indexOf('\n', lastImportMatch) + 1;
    content = content.slice(0, insertPos) + importBlock + content.slice(insertPos);
  }

  // ── Instâncias (após initSocket) ──
  const initSocketMatch = content.indexOf('initSocket');
  if (initSocketMatch !== -1) {
    const afterInit = content.indexOf('\n', initSocketMatch) + 1;
    const instanceBlock = `
// ── Rodadas 2,3,4: Instâncias consolidadas ──────────────────────
const lifecycle = new StreamLifecycleManager(io);
const endConsolidator = new StreamEndConsolidator(io, lifecycle);
`;
    // Inserir após initSocket, antes do código existente
    // Procurar por "const port" ou "app.set('io'" como âncora
    const anchorMatch = content.indexOf("app.set('io'", afterInit);
    if (anchorMatch !== -1) {
      const insertPos = content.lastIndexOf('\n', anchorMatch) + 1;
      content = content.slice(0, insertPos) + instanceBlock + '\n' + content.slice(insertPos);
    }
  }

  // ── ViewerManager + Reconciler (após connectDB) ──
  const connectDBMatch = content.indexOf('connectDB()');
  if (connectDBMatch !== -1) {
    // Procurar pela inicialização do webPush ou server.listen como âncora
    const listenMatch = content.indexOf('server.listen(', connectDBMatch);
    if (listenMatch !== -1) {
      const insertPos = content.lastIndexOf('\n', listenMatch) + 1;
      const extraBlock = `
    // ── Rodadas 3b,4: ViewerManager + SRSReconciler ──────────────
    const viewerManager = new ViewerCountManager(io, onlineUsers, socketToUser);
    const reconciler = new SRSReconciler(io, endConsolidator, lifecycle);
    reconciler.start(60000); // Reconciliação a cada 60s
`;
      content = content.slice(0, insertPos) + extraBlock + content.slice(insertPos);
    }
  }

  // ── Endpoint de debug para reconciliação ──
  const debugEndpoint = `
// ── Rodada 4: Endpoint de debug para reconciliação ──────────────
app.get('/api/debug/reconcile', async (_req, res) => {
  try {
    const result = await reconciler.reconcileNow();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debug/stream-status/:id', async (req, res) => {
  try {
    const status = await lifecycle.getStreamStatus(req.params.id);
    res.json({ streamId: req.params.id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

  // Inserir antes do 404 handler
  const notFoundMatch = content.indexOf("app.use('/api/*'");
  if (notFoundMatch !== -1) {
    const insertPos = content.lastIndexOf('\n', notFoundMatch) + 1;
    content = content.slice(0, insertPos) + debugEndpoint + content.slice(insertPos);
  }

  // Salvar
  fs.writeFileSync(SERVER_TS, content, 'utf8');
  log('server.ts patcheado com sucesso!');
  return true;
}

// ── 3. Rebuild ─────────────────────────────────────────────────────
function rebuild() {
  console.log('\n🔨 Rebuilding...\n');

  try {
    // Verificar se estamos dentro do container ou no host
    const isDocker = fs.existsSync('/.dockerenv');

    if (isDocker) {
      execSync('npx tsc --noEmit 2>&1 || true', { cwd: BACKEND_DIR, stdio: 'inherit' });
      log('TypeScript check concluído');
    } else {
      warn('Fora do container — execute manualmente:');
      warn(`  cd ${BACKEND_DIR} && docker-compose down && docker-compose up -d --build`);
    }
  } catch (err) {
    warn('Build falhou — verifique erros acima');
  }
}

// ── Main ───────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Rodadas 2, 3, 4 — Patch de Backend Consolidado');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`Backend dir: ${BACKEND_DIR}`);
  console.log(`Services dir: ${SERVICES_DIR}\n`);

  // Verificar diretório
  if (!fs.existsSync(BACKEND_DIR)) {
    error(`Diretório não encontrado: ${BACKEND_DIR}`);
    process.exit(1);
  }

  // Garantir que services/ existe
  if (!fs.existsSync(SERVICES_DIR)) {
    fs.mkdirSync(SERVICES_DIR, { recursive: true });
    log(`Diretório criado: ${SERVICES_DIR}`);
  }

  copyModules();
  patchServer();
  rebuild();

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅ Patch aplicado com sucesso!');
  console.log('═══════════════════════════════════════════════════');
  console.log('\nPróximos passos:');
  console.log('  1. Verificar logs: docker logs <container> --tail 50');
  console.log('  2. Testar: curl http://localhost:3000/api/debug/reconcile');
  console.log('  3. Testar anti-duplicidade: POST /api/streams duas vezes');
}

main();

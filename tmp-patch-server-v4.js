const fs = require('fs');
const SERVER = '/app/backend/src/server.ts';

let c = fs.readFileSync(SERVER, 'utf8');

if (c.includes('StreamLifecycleManager')) {
  console.log('JA_PATCHED');
  process.exit(0);
}

fs.writeFileSync(SERVER + '.bak', c);
console.log('Backup OK');

// 1. Imports - inserir depois da linha "import { initSocket } from './socket';"
const initImport = c.indexOf("import { initSocket } from './socket'");
if (initImport > 0) {
  const lineEnd = c.indexOf('\n', initImport) + 1;
  const imports = `
// Rodadas 2,3,4: Imports consolidados
import { StreamLifecycleManager } from "./services/StreamLifecycleManager";
import { StreamEndConsolidator } from "./services/StreamEndConsolidator";
import { ViewerCountManager } from "./services/ViewerCountManager";
import { SRSReconciler } from "./services/SRSReconciler";
`;
  c = c.slice(0, lineEnd) + imports + c.slice(lineEnd);
  console.log('Imports OK');
}

// 2. Instancias - DEPOIS de "const io = initSocket(server)"
const ioDecl = c.indexOf('const io = initSocket');
if (ioDecl > 0) {
  const lineEnd = c.indexOf('\n', ioDecl) + 1;
  const inst = `
// Rodadas 2,3,4: Instancias consolidadas
const lifecycle = new StreamLifecycleManager(io);
const endConsolidator = new StreamEndConsolidator(io, lifecycle);
`;
  c = c.slice(0, lineEnd) + inst + c.slice(lineEnd);
  console.log('Instancias OK');
}

// 3. ViewerManager + Reconciler - DEPOIS de "const socketToUser = new Map"
const socketToUserIdx = c.indexOf('const socketToUser = new Map<string, string>');
if (socketToUserIdx > 0) {
  const lineEnd = c.indexOf('\n', socketToUserIdx) + 1;
  const vm = `
// Rodadas 3b,4: ViewerManager + Reconciler
const viewerManager = new ViewerCountManager(io, onlineUsers as any, socketToUser as any);
const reconciler = new SRSReconciler(io, endConsolidator, lifecycle);
reconciler.start(60000);
`;
  c = c.slice(0, lineEnd) + vm + c.slice(lineEnd);
  console.log('ViewerManager OK');
}

// 4. Debug endpoints
const notFound = c.indexOf("app.use('/api/*'");
if (notFound > 0) {
  const lineStart = c.lastIndexOf('\n', notFound) + 1;
  const debug = `
// Rodadas 2,3,4: Debug endpoints
app.get("/api/debug/reconcile", async (_req: any, res: any) => {
  try { const r = await reconciler.reconcileNow(); res.json({ success: true, ...r }); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.get("/api/debug/stream-status/:id", async (req: any, res: any) => {
  try { const s = await lifecycle.getStreamStatus(req.params.id); res.json({ streamId: req.params.id, status: s }); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});
`;
  c = c.slice(0, lineStart) + debug + c.slice(lineStart);
  console.log('DebugEndpoints OK');
}

fs.writeFileSync(SERVER, c);
console.log('PATCH_DONE');

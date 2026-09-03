const fs = require('fs');
let c = fs.readFileSync('/app/src/server.ts', 'utf8');

if (c.includes('StreamLifecycleManager')) {
  console.log('JA_PATCHED');
  process.exit(0);
}

fs.writeFileSync('/app/src/server.ts.bak2', c);
console.log('Backup feito');

// 1. Imports (apos ultimo import)
const lastImport = c.lastIndexOf('\nimport ');
if (lastImport > 0) {
  const insertAt = c.indexOf('\n', lastImport + 1) + 1;
  const imports = `
// Rodadas 2,3,4: Imports consolidados
import { StreamLifecycleManager } from "./services/StreamLifecycleManager";
import { StreamEndConsolidator } from "./services/StreamEndConsolidator";
import { ViewerCountManager } from "./services/ViewerCountManager";
import { SRSReconciler } from "./services/SRSReconciler";
`;
  c = c.slice(0, insertAt) + imports + c.slice(insertAt);
  console.log('Imports OK');
}

// 2. Instancias apos initSocket
const initIdx = c.indexOf('initSocket');
if (initIdx > 0) {
  const lineEnd = c.indexOf('\n', initIdx) + 1;
  const inst = `
// Rodadas 2,3,4: Instancias consolidadas
const lifecycle = new StreamLifecycleManager(io);
const endConsolidator = new StreamEndConsolidator(io, lifecycle);
`;
  c = c.slice(0, lineEnd) + inst + c.slice(lineEnd);
  console.log('Instancias OK');
}

// 3. ViewerManager + Reconciler apos onlineUsers Map
const onlineIdx = c.indexOf('const onlineUsers = new Map');
if (onlineIdx > 0) {
  const lineEnd = c.indexOf('\n', onlineIdx) + 1;
  const vm = `
// Rodadas 3b,4: ViewerManager + Reconciler
const viewerManager = new ViewerCountManager(io, onlineUsers as any, socketToUser as any);
const reconciler = new SRSReconciler(io, endConsolidator, lifecycle);
reconciler.start(60000);
`;
  c = c.slice(0, lineEnd) + vm + c.slice(lineEnd);
  console.log('ViewerManager OK');
}

// 4. Debug endpoints (antes do primeiro "app.use.*404" ou fim do arquivo)
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

fs.writeFileSync('/app/src/server.ts', c);
console.log('PATCH_DONE');

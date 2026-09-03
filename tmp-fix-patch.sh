#!/bin/sh
set -e
C=app-backend

echo "=== 1. Restaurando backup ==="
docker exec $C sh -c "cp /app/src/server.ts.bak /app/src/server.ts && echo RESTORED"

echo ""
echo "=== 2. Verificando backup restaurado ==="
docker exec $C sh -c "grep -c StreamLifecycleManager /app/src/server.ts || echo CLEAN"

echo ""
echo "=== 3. Patch CORRETO com node (sed corrompe aspas) ==="
# Usar node inline para patchear — sed tem problema com aspas duplas no sed -i
docker exec $C sh -c 'node -e "
const fs = require(\"fs\");
let c = fs.readFileSync(\"/app/src/server.ts\", \"utf8\");
const bak = c;

// Ja patcheado?
if (c.includes(\"StreamLifecycleManager\")) { console.log(\"JA_PATCHED\"); process.exit(0); }

// 1. Imports
const lastImport = c.lastIndexOf(\"import \");
if (lastImport > 0) {
  const insertAt = c.indexOf(\"\\n\", lastImport) + 1;
  const imports = \"
// Rodadas 2,3,4: Imports consolidados
import { StreamLifecycleManager } from \\\"./services/StreamLifecycleManager\\\";
import { StreamEndConsolidator } from \\\"./services/StreamEndConsolidator\\\";
import { ViewerCountManager } from \\\"./services/ViewerCountManager\\\";
import { SRSReconciler } from \\\"./services/SRSReconciler\\\";
\";
  c = c.slice(0, insertAt) + imports + c.slice(insertAt);
  console.log(\"Imports OK\");
}

// 2. Instancias apos initSocket
const initIdx = c.indexOf(\"initSocket\");
if (initIdx > 0) {
  const lineEnd = c.indexOf(\"\\n\", initIdx) + 1;
  const inst = \"
// Rodadas 2,3,4: Instancias consolidadas
const lifecycle = new StreamLifecycleManager(io);
const endConsolidator = new StreamEndConsolidator(io, lifecycle);
\";
  c = c.slice(0, lineEnd) + inst + c.slice(lineEnd);
  console.log(\"Instancias OK\");
}

// 3. ViewerManager + Reconciler apos onlineUsers Map
const onlineIdx = c.indexOf(\"const onlineUsers = new Map\");
if (onlineIdx > 0) {
  const lineEnd = c.indexOf(\"\\n\", onlineIdx) + 1;
  const vm = \"
// Rodadas 3b,4: ViewerManager + Reconciler
const viewerManager = new ViewerCountManager(io, onlineUsers as any, socketToUser as any);
const reconciler = new SRSReconciler(io, endConsolidator, lifecycle);
reconciler.start(60000);
\";
  c = c.slice(0, lineEnd) + vm + c.slice(lineEnd);
  console.log(\"ViewerManager OK\");
}

// 4. Debug endpoints antes do 404
const notFound = c.indexOf(\"404\");
if (notFound > 0) {
  const lineStart = c.lastIndexOf(\"\\n\", notFound) + 1;
  const debug = \"
// Rodadas 2,3,4: Debug endpoints
app.get(\\\"/api/debug/reconcile\\\", async (_req: any, res: any) => { try { const r = await reconciler.reconcileNow(); res.json({ success: true, ...r }); } catch (e: any) { res.status(500).json({ error: e.message }); } });
app.get(\\\"/api/debug/stream-status/:id\\\", async (req: any, res: any) => { try { const s = await lifecycle.getStreamStatus(req.params.id); res.json({ streamId: req.params.id, status: s }); } catch (e: any) { res.status(500).json({ error: e.message }); } });
\";
  c = c.slice(0, lineStart) + debug + c.slice(lineStart);
  console.log(\"DebugEndpoints OK\");
}

fs.writeFileSync(\"/app/src/server.ts\", c);
console.log(\"PATCH_DONE\");
"'

echo ""
echo "=== 4. Verificando patch ==="
docker exec $C sh -c "grep -c StreamLifecycleManager /app/src/server.ts"

echo ""
echo "=== 5. Erros de TS ==="
docker exec $C sh -c "cd /app && npx tsc --noEmit 2>&1 | head -20"
echo "TSC_EXIT=$?"

echo ""
echo "=== 6. Compilando ==="
docker exec $C sh -c "cd /app && npx tsc 2>&1 | tail -10"
echo "COMPILE_EXIT=$?"

echo ""
echo "=== 7. Restart ==="
docker restart $C
sleep 5
docker logs $C --tail 15 2>&1

echo ""
echo "=== DEPLOY_BACKEND_OK ==="

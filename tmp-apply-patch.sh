#!/bin/sh
set -e
C=app-backend

echo "=== 1. Verificando modulos ==="
docker exec $C sh -c "ls /app/src/services/Stream*.ts /app/src/services/Viewer*.ts /app/src/services/SRS*.ts"

echo ""
echo "=== 2. Patch server.ts ==="
docker exec $C sh -c '
  grep -q StreamLifecycleManager /app/src/server.ts && { echo JA_PATCHED; exit 0; }
  cp /app/src/server.ts /app/src/server.ts.bak

  # 1. Imports (apos ultimo import)
  LINE=$(grep -n "^import " /app/src/server.ts | tail -1 | cut -d: -f1)
  sed -i "${LINE}a\\
\\
// Rodadas 2,3,4: Imports consolidados\\
import { StreamLifecycleManager } from \"./services/StreamLifecycleManager\";\\
import { StreamEndConsolidator } from \"./services/StreamEndConsolidator\";\\
import { ViewerCountManager } from \"./services/ViewerCountManager\";\\
import { SRSReconciler } from \"./services/SRSReconciler\";" /app/src/server.ts
  echo Imports_OK

  # 2. Instancias apos initSocket
  LINE=$(grep -n "initSocket" /app/src/server.ts | head -1 | cut -d: -f1)
  sed -i "${LINE}a\\
\\
// Rodadas 2,3,4: Instancias consolidadas\\
const lifecycle = new StreamLifecycleManager(io);\\
const endConsolidator = new StreamEndConsolidator(io, lifecycle);" /app/src/server.ts
  echo Instancias_OK

  # 3. ViewerManager + Reconciler
  LINE=$(grep -n "onlineUsers" /app/src/server.ts | head -1 | cut -d: -f1)
  sed -i "${LINE}a\\
\\
// Rodadas 3b,4: ViewerManager + Reconciler\\
const viewerManager = new ViewerCountManager(io, onlineUsers as any, socketToUser as any);\\
const reconciler = new SRSReconciler(io, endConsolidator, lifecycle);\\
reconciler.start(60000);" /app/src/server.ts
  echo ViewerManager_OK

  # 4. Debug endpoints antes do 404
  LINE=$(grep -n "404" /app/src/server.ts | head -1 | cut -d: -f1)
  if [ -n "$LINE" ]; then
    sed -i "${LINE}a\\
\\
// Rodadas 2,3,4: Debug endpoints\\
app.get(\"/api/debug/reconcile\", async (_req: any, res: any) => { try { const r = await reconciler.reconcileNow(); res.json({ success: true, ...r }); } catch (e: any) { res.status(500).json({ error: e.message }); } });\\
app.get(\"/api/debug/stream-status/:id\", async (req: any, res: any) => { try { const s = await lifecycle.getStreamStatus(req.params.id); res.json({ streamId: req.params.id, status: s }); } catch (e: any) { res.status(500).json({ error: e.message }); } });" /app/src/server.ts
    echo DebugEndpoints_OK
  fi

  echo PATCH_DONE
'

echo ""
echo "=== 3. Verificando patch ==="
docker exec $C sh -c "grep -c StreamLifecycleManager /app/src/server.ts"

echo ""
echo "=== 4. Compilando ==="
docker exec $C sh -c "cd /app && npx tsc 2>&1 | tail -20"
echo "TSC_EXIT=$?"

echo ""
echo "=== 5. Restart ==="
docker restart $C
sleep 3
docker logs $C --tail 10

echo ""
echo "=== DEPLOY_BACKEND_OK ==="

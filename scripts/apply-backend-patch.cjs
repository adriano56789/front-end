#!/usr/bin/env node
/**
 * apply-backend-patch.cjs — Tudo numa única sessão SSH
 */
const { Client } = require('ssh2');
const c = new Client();
c.on('keyboard-interactive', (n,i,l,p,f) => f(['MshrUfZrh09hWr#']));
c.on('ready', () => {
  console.log('✅ Conectado\n');

  const script = `
set -e
C=app-backend

echo "=== 1. Módulos em /app/src/services ==="
docker exec $C sh -c "ls /app/src/services/Stream*.ts /app/src/services/Viewer*.ts /app/src/services/SRS*.ts 2>/dev/null"

echo ""
echo "=== 2. Patch server.ts ==="
docker exec $C sh -c "
  grep -q StreamLifecycleManager /app/src/server.ts && { echo JA_PATCHED; exit 0; }

  # Backup
  cp /app/src/server.ts /app/src/server.ts.bak

  # 1. Imports
  LINE=\\\$(grep -n '^import ' /app/src/server.ts | tail -1 | cut -d: -f1)
  sed -i \\\${LINE}a'\\
\\
// Rodadas 2,3,4: Imports consolidados\\
import { StreamLifecycleManager } from \"./services/StreamLifecycleManager\";\\
import { StreamEndConsolidator } from \"./services/StreamEndConsolidator\";\\
import { ViewerCountManager } from \"./services/ViewerCountManager\";\\
import { SRSReconciler } from \"./services/SRSReconciler\";' /app/src/server.ts
  echo Imports_OK

  # 2. Instancias apos initSocket
  LINE=\\\$(grep -n 'initSocket' /app/src/server.ts | head -1 | cut -d: -f1)
  sed -i \\\${LINE}a'\\
\\
// Rodadas 2,3,4: Instancias consolidadas\\
const lifecycle = new StreamLifecycleManager(io);\\
const endConsolidator = new StreamEndConsolidator(io, lifecycle);' /app/src/server.ts
  echo Instancias_OK

  # 3. ViewerManager + Reconciler (pos onlineUsers Map)
  LINE=\\\$(grep -n 'onlineUsers' /app/src/server.ts | head -1 | cut -d: -f1)
  sed -i \\\${LINE}a'\\
\\
// Rodadas 3b,4: ViewerManager + Reconciler\\
const viewerManager = new ViewerCountManager(io, onlineUsers as any, socketToUser as any);\\
const reconciler = new SRSReconciler(io, endConsolidator, lifecycle);\\
reconciler.start(60000);' /app/src/server.ts
  echo ViewerManager_OK

  # 4. Debug endpoints antes do 404
  LINE=\\\$(grep -n '404' /app/src/server.ts | head -1 | cut -d: -f1)
  [ -n \"\\\$LINE\" ] && sed -i \\\${LINE}a'\\
\\
// Rodadas 2,3,4: Debug endpoints\\
app.get(\"/api/debug/reconcile\", async (_req: any, res: any) => { try { const r = await reconciler.reconcileNow(); res.json({ success: true, ...r }); } catch (e: any) { res.status(500).json({ error: e.message }); } });\\
app.get(\"/api/debug/stream-status/:id\", async (req: any, res: any) => { try { const s = await lifecycle.getStreamStatus(req.params.id); res.json({ streamId: req.params.id, status: s }); } catch (e: any) { res.status(500).json({ error: e.message }); } });' /app/src/server.ts
  echo DebugEndpoints_OK

  echo PATCH_DONE
"

echo ""
echo "=== 3. Verificando patch ==="
docker exec $C sh -c "grep -c StreamLifecycleManager /app/src/server.ts"

echo ""
echo "=== 4. Compilando (tsc) ==="
docker exec $C sh -c "cd /app && npx tsc 2>&1 | tail -20"
echo "TSC_DONE"

echo ""
echo "=== 5. Restart container ==="
docker restart $C
sleep 3
docker logs $C --tail 5

echo ""
echo "=== DEPLOY_BACKEND_OK ==="
`;

  c.exec(script, (e, s) => {
    s.on('data', d => process.stdout.write(d));
    s.stderr.on('data', d => process.stdout.write(d));
    s.on('close', () => { c.end(); process.exit(0); });
  });
});
c.on('error', e => { console.error('ERR:', e.message); process.exit(1); });
c.connect({host:'2.25.192.154',port:22,username:'root',password:'MshrUfZrh09hWr#',tryKeyboard:true,readyTimeout:60000,keepaliveInterval:15000});
setTimeout(() => process.exit(1), 300000);

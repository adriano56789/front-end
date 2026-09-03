#!/bin/sh
set -e

echo "=== 1. Copiar modulos para /app/backend/src/services/ ==="
cp /tmp/StreamLifecycleManager.ts /app/backend/src/services/
cp /tmp/StreamEndConsolidator.ts /app/backend/src/services/
cp /tmp/ViewerCountManager.ts /app/backend/src/services/
cp /tmp/SRSReconciler.ts /app/backend/src/services/
echo "Modulos OK"

echo ""
echo "=== 2. Patch server.ts com node (sem sed) ==="
node /tmp/patch-server.js

echo ""
echo "=== 3. Verificar patch ==="
grep -c StreamLifecycleManager /app/backend/src/server.ts

echo ""
echo "=== 4. Build da imagem Docker ==="
cd /app && docker-compose build backend 2>&1 | tail -20
echo "BUILD_EXIT=$?"

echo ""
echo "=== 5. Parar container antigo e subir novo ==="
cd /app && docker-compose up -d backend 2>&1
sleep 5

echo ""
echo "=== 6. Status ==="
docker ps --filter name=app-backend --format "table {{.Names}}\t{{.Status}}"
echo ""
docker logs app-backend --tail 10 2>&1

echo ""
echo "=== DEPLOY_OK ==="

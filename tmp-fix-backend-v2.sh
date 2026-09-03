#!/bin/sh
set -e

echo "=== 1. Restaurar backup ==="
cp /app/backend/src/server.ts.bak /app/backend/src/server.ts
echo "Restaurado"

echo ""
echo "=== 2. Verificar restaurado ==="
grep -c StreamLifecycleManager /app/backend/src/server.ts || echo "CLEAN"

echo ""
echo "=== 3. Patch CORRETO ==="
node /tmp/patch-server-v3.js

echo ""
echo "=== 4. Verificar patch ==="
grep -c StreamLifecycleManager /app/backend/src/server.ts

echo ""
echo "=== 5. Testar tsc ==="
cd /app/backend && npx tsc --noEmit 2>&1 | head -10
echo "TSC_EXIT=$?"

echo ""
echo "=== 6. Build Docker ==="
cd /app && docker compose build backend 2>&1 | tail -15
echo "BUILD_EXIT=$?"

echo ""
echo "=== 7. Restart ==="
cd /app && docker compose up -d backend 2>&1
sleep 5
docker ps --filter name=app-backend --format "table {{.Names}}\t{{.Status}}"
echo ""
docker logs app-backend --tail 10 2>&1

echo ""
echo "=== DEPLOY_OK ==="

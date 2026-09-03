#!/bin/sh
set -e
C=app-backend

# Fix require paths dentro do container
docker exec $C sh -c "sed -i 's|require(\"./models/index\")|require(\"../models/index\")|g' /app/src/services/StreamLifecycleManager.ts /app/src/services/StreamEndConsolidator.ts /app/src/services/ViewerCountManager.ts /app/src/services/SRSReconciler.ts"
echo "PATHS_FIXED"

docker exec $C sh -c "grep -n 'require.*models' /app/src/services/StreamLifecycleManager.ts | head -3"

# Rebuild
cd /app && docker compose build backend 2>&1 | tail -5
echo "BUILD_EXIT=$?"

# Restart
cd /app && docker compose up -d backend 2>&1
sleep 8
docker ps --filter name=app-backend --format "table {{.Names}}\t{{.Status}}"
echo ""
docker logs app-backend --tail 15 2>&1
echo ""
echo "=== DEPLOY_OK ==="

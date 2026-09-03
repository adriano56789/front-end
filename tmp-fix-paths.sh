#!/bin/sh
set -e
# Fix require paths in all 4 modules
for f in StreamLifecycleManager.ts StreamEndConsolidator.ts ViewerCountManager.ts SRSReconciler.ts; do
  sed -i 's|require("./models/index")|require("../models/index")|g' /app/src/services/$f
done
grep -n "require.*models" /app/src/services/StreamLifecycleManager.ts | head -3
echo "PATHS_FIXED"

# Rebuild
cd /app && docker compose build backend 2>&1 | tail -5
echo "BUILD_EXIT=$?"

# Restart
cd /app && docker compose up -d backend 2>&1
sleep 5
docker ps --filter name=app-backend --format "table {{.Names}}\t{{.Status}}"
echo ""
docker logs app-backend --tail 15 2>&1
echo ""
echo "=== DEPLOY_OK ==="

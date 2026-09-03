#!/bin/sh
set -e

echo "=== 1. Fix StreamLifecycleManager duplicata ==="
# Remover a PRIMEIRA ocorrência de streamStatus antes do ...streamData
# Linha: streamStatus: 'preparing',\n        startTime...
# Objeto: remover a linha streamStatus antes do spread
cd /app/backend/src/services
# Usar node para fix preciso
node -e "
const fs = require('fs');
let c = fs.readFileSync('StreamLifecycleManager.ts', 'utf8');
// Remover a primeira streamStatus antes do ...streamData
c = c.replace(/(\s+streamStatus: 'preparing',\n\s+startTime:)/, '\$1'.replace(/\n\s+streamStatus: 'preparing',\n/, '\n'));
// Versao mais simples: remover a linha streamStatus antes do ...streamData
const lines = c.split('\n');
const result = [];
let foundSpread = false;
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed === '...streamData,') {
    foundSpread = true;
    result.push(lines[i]);
  } else if (trimmed.startsWith('streamStatus:') && trimmed.includes('preparing') && !foundSpread) {
    // Pular esta linha (primeira streamStatus antes do spread)
    continue;
  } else {
    result.push(lines[i]);
  }
}
fs.writeFileSync('StreamLifecycleManager.ts', result.join('\n'));
console.log('StreamLifecycleManager duplicata removida');
"
echo "Fix OK"

echo ""
echo "=== 2. Restaurar server.ts backup ==="
cp /app/backend/src/server.ts.bak /app/backend/src/server.ts
echo "Restaurado"

echo ""
echo "=== 3. Re-upload e aplicar patch v4 ==="
cp /tmp/patch-server-v4.js /tmp/patch-server.js
node /tmp/patch-server-v4.js

echo ""
echo "=== 4. Build Docker ==="
cd /app && docker compose build backend 2>&1 | tail -20
echo "BUILD_EXIT=$?"

echo ""
echo "=== 5. Restart ==="
cd /app && docker compose up -d backend 2>&1
sleep 5
docker ps --filter name=app-backend --format "table {{.Names}}\t{{.Status}}"
echo ""
docker logs app-backend --tail 10 2>&1

echo ""
echo "=== DEPLOY_OK ==="

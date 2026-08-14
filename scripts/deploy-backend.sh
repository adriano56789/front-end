#!/bin/bash
set -e
echo "==> [1/3] tar presente no host"
test -f /tmp/backend-dist.tar.gz || { echo "ERRO: /tmp/backend-dist.tar.gz ausente"; exit 1; }

echo "==> [2/3] copiando para dentro do container e extraindo"
docker cp /tmp/backend-dist.tar.gz app-backend:/tmp/backend-dist.tar.gz
docker exec app-backend sh -c '
  set -e
  cd /app
  if [ -d dist ]; then cp -r dist dist.backup-$(date +%s); fi
  rm -rf dist
  mkdir dist
  tar -xzf /tmp/backend-dist.tar.gz -C dist
  rm -f /tmp/backend-dist.tar.gz
  echo extraido_ok
'

echo "==> [3/3] reiniciando app-backend"
docker restart app-backend
echo DEPLOYED_OK

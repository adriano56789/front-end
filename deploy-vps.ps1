# Deploy frontend para VPS - /var/www/livego.store
# Execute: powershell -ExecutionPolicy Bypass -File deploy-vps.ps1

$VPS = "root@2.25.192.154"
$REMOTE_DIR = "/var/www/livego.store"
$DIST = "C:\Users\adria\Desktop\front-end\dist"

Write-Host "=== Deploy Frontend para VPS ===" -ForegroundColor Cyan
Write-Host "Destino: $VPS`:$REMOTE_DIR" -ForegroundColor Yellow

# Limpar remote
Write-Host "[1/3] Limpando remote..." -ForegroundColor Gray
ssh -o StrictHostKeyChecking=no $VPS "rm -rf $REMOTE_DIR/*"

# Upload via SCP
Write-Host "[2/3] Uploading dist..." -ForegroundColor Gray
scp -o StrictHostKeyChecking=no -r "$DIST\*" "${VPS}:${REMOTE_DIR}/"

# Verificar
Write-Host "[3/3] Verificando..." -ForegroundColor Gray
ssh -o StrictHostKeyChecking=no $VPS "ls -la $REMOTE_DIR/ | head -20"

Write-Host "=== Deploy completo! ===" -ForegroundColor Green

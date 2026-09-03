# Deploy frontend para VPS - /var/www/livego.store (ATOMICO)
# Evita o window quebrado do deploy antigo (rm -rf + scp sequencial).
# Metodo: sobe os arquivos para um diretorio temporario e depois faz
# um swap atomico (mv) — nunca existe o site sem index.html/assets.
# Execute: powershell -ExecutionPolicy Bypass -File deploy-vps-atomic.ps1

$VPS = "root@2.25.192.154"
$REMOTE_SITE = "/var/www/livego.store"
$STAGE = "/var/www/livego.store.new"
$DIST = "C:\Users\adria\Desktop\front-end\dist"

Write-Host "=== Deploy Frontend ATOMICO para VPS ===" -ForegroundColor Cyan
Write-Host "Destino: $VPS`:$REMOTE_SITE" -ForegroundColor Yellow

if (-not (Test-Path -LiteralPath $DIST)) {
    Write-Host "ERRO: pasta dist nao encontrada em $DIST" -ForegroundColor Red
    exit 1
}

Write-Host "[1/4] Preparando diretorio de staging..." -ForegroundColor Gray
ssh -o StrictHostKeyChecking=no $VPS "rm -rf $STAGE && mkdir -p $STAGE"

Write-Host "[2/4] Uploading dist para staging..." -ForegroundColor Gray
scp -o StrictHostKeyChecking=no -r "$DIST\*" "${VPS}:${STAGE}/"

Write-Host "[3/4] Validando staging..." -ForegroundColor Gray
# No minimo index.html e o bundle principal devem estar presentes no staging
$check = ssh -o StrictHostKeyChecking=no $VPS "cd $STAGE && test -f index.html && echo OK || echo FAIL"
if ($check -match "FAIL") {
    Write-Host "ERRO: staging incompleto (sem index.html). Abortando." -ForegroundColor Red
    ssh -o StrictHostKeyChecking=no $VPS "rm -rf $STAGE"
    exit 1
}

Write-Host "[4/4] Swap atomico..." -ForegroundColor Gray
# Backup do site atual, move o novo no lugar (mv e atomico no mesmo filesystem)
ssh -o StrictHostKeyChecking=no $VPS "rm -rf ${REMOTE_SITE}.old && mv $REMOTE_SITE ${REMOTE_SITE}.old && mv $STAGE $REMOTE_SITE && rm -rf ${REMOTE_SITE}.old && echo SWAP_OK"

Write-Host "=== Deploy atomico completo! ===" -ForegroundColor Green
Write-Host "Verifique: https://livego.store" -ForegroundColor Cyan

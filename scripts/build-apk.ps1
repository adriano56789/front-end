param(
    [switch]$DeployBackend,
    [string]$VpsIp = "72.60.249.175"
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  LIVEGO - BUILD APK + DEPLOY" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build Backend
Write-Host "[1/4] Compilando Backend..." -ForegroundColor Yellow
Set-Location -LiteralPath "$PSScriptRoot\..\backend"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERRO no build do backend" -ForegroundColor Red; exit 1 }
Write-Host "Backend compilado com sucesso!" -ForegroundColor Green

# 2. Deploy Backend (opcional)
if ($DeployBackend) {
    Write-Host "[2/4] Deployando Backend na VPS $VpsIp..." -ForegroundColor Yellow
    ssh "root@$VpsIp" @'
cd /var/www/livego
git pull
docker rm -f livego-backend
docker build -t livego-backend ./backend
docker run -d --name livego-backend --network livego_livego-network --restart unless-stopped \
  -p 3000:3000 -p 3001:3001 \
  -e NODE_ENV=production -e PORT=3000 -e WS_PORT=3001 -e HOST=0.0.0.0 \
  -e MONGODB_URI="mongodb://livego:adriano123@mongodb:27017/api?authSource=api" \
  -e MONGODB_NAME=api \
  -e SRS_HOST=livego-srs -e SRS_API_PORT=1985 -e SRS_HTTP_PORT=8080 -e SRS_WEBRTC_PORT=8000 \
  -e CANDIDATE=72.60.249.175 \
  -e BACKEND_URL=https://api.livego.store -e FRONTEND_URL=https://livego.store \
  -e JWT_SECRET=livego_jwt_secret_docker \
  -v livego_uploads_data:/app/uploads \
  livego-backend
'@
    if ($LASTEXITCODE -ne 0) { Write-Host "ERRO no deploy" -ForegroundColor Red; exit 1 }
    Write-Host "Backend deployado!" -ForegroundColor Green
} else {
    Write-Host "[2/4] Deploy pulado (use -DeployBackend para ativar)" -ForegroundColor Gray
}

# 3. Build APK
Write-Host "[3/4] Buildando APK Android..." -ForegroundColor Yellow
Set-Location -LiteralPath "$PSScriptRoot\..\android"

# Ajustar local.properties
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path -LiteralPath $sdkPath)) {
    # Tentar caminhos alternativos
    $altPaths = @("C:\Users\Usuario\AppData\Local\Android\Sdk", "${env:ProgramFiles}\Android\Sdk")
    foreach ($p in $altPaths) {
        if (Test-Path -LiteralPath $p) { $sdkPath = $p; break }
    }
}
"## This file must *NOT* be checked into Version Control Systems,
# Location of the SDK.
sdk.dir=$($sdkPath -replace '\\', '\\')
" | Set-Content -Path "local.properties" -Encoding ASCII

# Build release APK
.\gradlew assembleRelease
if ($LASTEXITCODE -ne 0) { Write-Host "ERRO no build do APK" -ForegroundColor Red; exit 1 }
Write-Host "APK gerado com sucesso!" -ForegroundColor Green

# 4. Localizar APK
$apkPath = "$PSScriptRoot\..\android\app\build\outputs\apk\release"
if (Test-Path -LiteralPath $apkPath) {
    $apk = Get-ChildItem -LiteralPath $apkPath -Filter "*.apk" | Select-Object -First 1
    if ($apk) {
        Write-Host "" -ForegroundColor Cyan
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host "  APK PRONTO:" -ForegroundColor Cyan
        Write-Host "  $($apk.FullName)" -ForegroundColor White
        Write-Host "  Tamanho: $($apk.Length/1MB -as [int]) MB" -ForegroundColor White
        Write-Host "======================================" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "✅ Build concluído!" -ForegroundColor Green

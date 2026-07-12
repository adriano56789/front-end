# ============================================================
# UPLOAD DAS ANIMAÇÕES DOS PRESENTES PARA A VPS
# ============================================================
# Execute este script no PowerShell (Windows)
# Requer: ssh configurado para root@2.25.192.154
# ============================================================

$BANDICAM_DIR = "C:\Users\adria\Videos\Bandicam"
$VPS = "root@2.25.192.154"
$REMOTE_DIR = "/var/www/livego.store/uploads/animations/"

$files = @(
    @{ src = "PixVerse_V6_Image_Text_360P_Crie_uma_animacão_.webm"; dest = "explosao_confete.webm" }
    @{ src = "PixVerse_V6_Image_Text_360P_Crie_uma_animacão_-_1__1.webm"; dest = "coracao_gigante.webm" }
    @{ src = "PixVerse_V6_Image_Text_360P_Crie_uma_animacão_-_2__1.webm"; dest = "show_de_luzes.webm" }
    @{ src = "PixVerse_V6_Image_Text_360P_Crie_uma_animacão_-_4_.webm"; dest = "portal_galactico.webm" }
    @{ src = "PixVerse_V6_Image_Text_360P_CENA_1__FRAME_FINA (1).webm"; dest = "chuva_de_rosas.webm" }
    @{ src = "Um-pirulito-colorido-gigante-aparece-no-centro-através-de-um-portal-de-açúcar-brilhante_-girando-em- (1).webm"; dest = "pirulito.webm" }
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ENVIANDO 6 ANIMAÇÕES PARA A VPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Primeiro criar o diretório remoto
ssh $VPS "mkdir -p $REMOTE_DIR"

foreach ($f in $files) {
    $srcPath = Join-Path $BANDICAM_DIR $f.src
    $destPath = $REMOTE_DIR + $f.dest
    
    if (Test-Path $srcPath) {
        Write-Host "📤 Enviando $($f.dest)..." -ForegroundColor Yellow
        scp "`"$srcPath`"" "${VPS}:${destPath}"
        Write-Host "   ✅ OK" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Arquivo não encontrado: $($f.src)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  UPLOAD CONCLUÍDO!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora execute na VPS:" -ForegroundColor White
Write-Host "  cd /var/www && bash scripts/setup-gift-animations.sh" -ForegroundColor Gray
Write-Host ""

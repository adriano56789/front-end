@echo off
echo ========================================
echo   Deploy Frontend para VPS
echo   Destino: /var/www/livego.store
echo ========================================
echo.

echo [1/3] Limpando dist remoto...
ssh -o StrictHostKeyChecking=no root@2.25.192.154 "rm -rf /var/www/livego.store/*"

echo [2/3] Enviando arquivos...
scp -o StrictHostKeyChecking=no -r "C:\Users\adria\Desktop\front-end\dist\*" root@2.25.192.154:/var/www/livego.store/

echo [3/3] Verificando...
ssh -o StrictHostKeyChecking=no root@2.25.192.154 "ls -la /var/www/livego.store/"

echo.
echo === Deploy completo! ===
pause

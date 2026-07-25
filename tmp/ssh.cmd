@echo off
echo MshrUfZrh09hWr# | ssh -o StrictHostKeyChecking=no root@2.25.192.154 "echo CONNECTED && ls -la /root/srs/ && echo ---NGINX--- && ls -la /app/nginx/ 2>/dev/null && echo ---BACKEND--- && ls -la /app/backend/ 2>/dev/null"

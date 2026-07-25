@echo off
echo MshrUfZrh09hWr# | ssh -o StrictHostKeyChecking=no root@2.25.192.154 "echo CONNECTED && ls -la /root/srs/ && echo ===SRS_CONF=== && cat /root/srs/*.conf && echo ===NGINX_CONF=== && cat /app/nginx/*.conf && echo ===DOCKER_PS=== && docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' && echo ===SRS_STREAMS=== && curl -s http://localhost:1985/api/v1/raw | head -100"

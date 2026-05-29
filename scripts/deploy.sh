#!/bin/bash

echo "=== DEPLOY LIVEGO - SCRIPT FINAL ==="

# Obter IP
IP_VPS=$(curl -s ifconfig.me)
echo "IP da VPS: $IP_VPS"

# 1. Instalar dependências
apt update && apt upgrade -y
apt install -y git curl wget gnupg software-properties-common ufw

# 2. Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# 3. Clonar projeto
cd /var/www
rm -rf livego
git clone git@github.com:adriano56789/livego.git 
cd livego

# 4. Build frontend
npm install
npm run build

# 5. Build backend
cd backend
npm install
npm run build

# 6. Verificar compilação
if [ ! -f "dist/server.js" ] && [ ! -f "dist/index.js" ]; then
    echo "ERRO: Compilação do backend falhou"
    exit 1
fi

# 7. Criar .env com URLs HTTPS (CORRIGIDO)
cat > .env <<EOF
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
FRONTEND_URL=https://livego.store
BACKEND_URL=https://api.livego.store
API_URL=https://api.livego.store
CORS_ORIGIN=https://livego.store,https://www.livego.store,https://api.livego.store
MONGODB_URI=mongodb://admin:adriano123@72.60.249.175:27017/livego?authSource=admin
JWT_SECRET=livego_jwt_secret_$(date +%s)
JWT_REFRESH_SECRET=livego_refresh_secret_$(date +%s)
TURN_SERVER=$IP_VPS
TURN_PORT=3478
STUN_SERVER=$IP_VPS
STUN_PORT=3478
WEBRTC_MIN_PORT=10000
WEBRTC_MAX_PORT=20000
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-8544166678866013-071608-5a99eb2e81c9d1321005f213a0ed2ce1-198663456
MERCADO_PAGO_PUBLIC_KEY=APP_USR-dac29668-9ab3-483f-ad46-8216c93786b2
MERCADO_PAGO_CLIENT_ID=8544166678866013
MERCADO_PAGO_CLIENT_SECRET=OvtQrTNHPFDNhptfkrldHwqQ9QjYzWhq
WEBHOOK_URL=https://api.livego.store/api/payments/webhook
NOTIFICATION_URL=https://api.livego.store/api/payments/notification
PLATFORM_FEE_PERCENTAGE=20
MIN_WITHDRAWAL_AMOUNT=5
EOF

# 8. Iniciar backend
pm2 stop livego-backend || true
pm2 delete livego-backend || true
pm2 start dist/server.js --name livego-backend --cwd /var/www/livego/backend
pm2 save
pm2 startup

# 9. Configurar Nginx com HTTPS
mkdir -p /var/www/certbot
cat > /etc/nginx/sites-available/livego <<'EOF'
server {
    listen 80;
    server_name livego.store www.livego.store;
    root /var/www/livego/dist;
    index index.html;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        return 301 https://api.livego.store$request_uri;
    }
    
    location /socket.io/ {
        return 301 https://api.livego.store/socket.io$request_uri;
    }
}

server {
    listen 80;
    server_name api.livego.store;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}
EOF

ln -sf /etc/nginx/sites-available/livego /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 10. Gerar SSL
echo "Gerando certificado SSL..."
certbot certonly --webroot --webroot-path=/var/www/certbot --email adrianomdk5@gmail.com --agree-tos --no-eff-email -d api.livego.store --non-interactive

# 11. Configurar HTTPS completo
if [ -f "/etc/letsencrypt/live/api.livego.store/fullchain.pem" ]; then
    echo "Configurando HTTPS completo..."
    cat > /etc/nginx/sites-available/livego <<'EOF'
server {
    listen 80;
    server_name livego.store www.livego.store;
    root /var/www/livego/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        return 301 https://api.livego.store$request_uri;
    }
    
    location /socket.io/ {
        return 301 https://api.livego.store/socket.io$request_uri;
    }
}

server {
    listen 80;
    server_name api.livego.store;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.livego.store;
    
    ssl_certificate /etc/letsencrypt/live/api.livego.store/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.livego.store/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    
    nginx -t && systemctl reload nginx
    echo "✅ HTTPS configurado!"
else
    echo "Gerando certificado auto-assinado..."
    
    # Gerar certificado auto-assinado
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/api.livego.store.key \
        -out /etc/ssl/certs/api.livego.store.crt \
        -subj "/C=BR/ST=SP/L=Sao Paulo/O=LiveGo/OU=API/CN=api.livego.store"
    
    # Configurar HTTPS com cert auto-assinado
    cat > /etc/nginx/sites-available/livego <<'EOF'
server {
    listen 80;
    server_name livego.store www.livego.store;
    root /var/www/livego/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        return 301 https://api.livego.store$request_uri;
    }
    
    location /socket.io/ {
        return 301 https://api.livego.store/socket.io$request_uri;
    }
}

server {
    listen 80;
    server_name api.livego.store;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.livego.store;
    
    ssl_certificate /etc/ssl/certs/api.livego.store.crt;
    ssl_certificate_key /etc/ssl/private/api.livego.store.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    
    nginx -t && systemctl reload nginx
    echo "✅ HTTPS configurado com certificado auto-assinado!"
fi

# 9. Firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable

# 10. Reiniciar serviços
systemctl restart mongod
pm2 restart livego-backend

# 11. Status final
echo "=== DEPLOY CONCLUÍDO ==="
echo "Frontend: https://livego.store"
echo "API: https://api.livego.store"
echo "Backend: $(pm2 list | grep livego-backend | grep online && echo 'ONLINE' || echo 'OFFLINE')"
echo "MongoDB: $(systemctl is-active mongod)"
echo "Deploy concluído!"

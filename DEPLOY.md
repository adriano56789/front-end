# Deploy Completo LiveGo — VPS

## 🚀 Deploy do Frontend (livego.store)

Da máquina local (pasta `front-end`):

```bash
npm run deploy
# ou: node deploy-frontend.cjs
```

O script faz tudo automaticamente:
1. Build local (`npm run build`)
2. Empacota `dist/` em um tarball
3. Envia para a VPS via SFTP (`2.25.192.154`)
4. Extrai em `/var/www/livego.store`
5. 🔥 **Limpeza automática**: apaga assets antigos (`index-*.js` / `index-*.css`)
   que o novo `index.html` NÃO referencia — evita acúmulo no disco. A limpeza
   roda DEPOIS da extração, então nunca apaga arquivo em uso (se a extração
   falhar, o site antigo continua íntegro).

> ⚠️ O frontend NÃO roda no Docker: é servido pelo nginx do host diretamente
> de `/var/www/livego.store` (o `livego-nginx` do Docker é só o proxy 80/443
> para a API). Para forçar a atualização do PWA instalado, o script também
> precisa subir um `firebase-messaging-sw.js` novo (bump `livenza-cache-vN`).

---

## 🔧 Deploy Automático (recomendado)

```bash
ssh root@72.60.249.175

# Baixar e executar o script
cd /var/www
git clone --recurse-submodules git@github.com:adriano56789/livego.git
cd livego
bash deploy-vps.sh
```

O script faz tudo automaticamente:
1. Verifica/instala dependências (Docker, Git)
2. Gera certificados SSL (Let's Encrypt) se necessário
3. Clona/atualiza o repositório com submódulos
4. Builda todas as imagens Docker
5. Sobe todos os containers na ordem correta
6. Aguarda MongoDB ficar saudável
7. Executa bootstrap do banco (init-db)
8. Verifica todos os serviços com health check

---

## 📋 Manual Passo a Passo

### Pré-requisitos

```bash
# Ubuntu 20.04+ como root
apt update && apt install -y git docker.io
```

### Domínios e DNS

- `livego.store` → frontend
- `api.livego.store` → backend API

Ambos devem apontar para o IP da VPS: `72.60.249.175`

### Firewall (portas liberadas)

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 1935/tcp
ufw allow 1985/tcp
ufw allow 8080/tcp
ufw allow 8000/udp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 49152:65535/udp
```

### 1. Clonar repositório

```bash
cd /var/www
git clone --recurse-submodules git@github.com:adriano56789/livego.git
cd livego
```

### 2. SSL (Let's Encrypt)

```bash
apt install -y certbot
certbot certonly --standalone -d livego.store -d www.livego.store \
  --email admin@livego.store --agree-tos --non-interactive
certbot certonly --standalone -d api.livego.store \
  --email admin@livego.store --agree-tos --non-interactive
```

### 3. Build imagens

```bash
docker build -t livego-backend ./backend
docker build -t livego-nginx -f nginx/Dockerfile .
docker build -t livego-srs ./srs        # ~15min na primeira vez
```

### 4. Subir containers

```bash
# Rede e volumes
docker network create livego_livego-network 2>/dev/null || true
docker volume create livego_mongodb_data 2>/dev/null || true
docker volume create livego_uploads_data 2>/dev/null || true

# Parar turnserver do host se existir
killall turnserver 2>/dev/null || true

# MongoDB
docker run -d --name livego-mongodb --network livego_livego-network --restart unless-stopped \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=adriano123 \
  -e MONGO_INITDB_DATABASE=api \
  -v livego_mongodb_data:/data/db \
  mongo:7 mongod --bind_ip_all --auth

# Aguardar MongoDB
for i in $(seq 1 30); do
  docker exec livego-mongodb mongosh mongodb://admin:adriano123@localhost:27017/admin \
    --quiet --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -q 1 && break
  sleep 2
done

# Init DB
docker run --rm --name livego-init-db --network livego_livego-network \
  -e ROOT_URI="mongodb://admin:adriano123@mongodb:27017/?authSource=admin" \
  -e APP_URI="mongodb://livego:adriano123@mongodb:27017/api?authSource=api" \
  -e APP_USER=livego -e APP_PASS=adriano123 -e APP_DB=api \
  -v /var/www/livego/api.json:/data/api.json:ro \
  -v /var/www/livego/backend/scripts/init-db.sh:/scripts/init-db.sh:ro \
  mongo:7 bash /scripts/init-db.sh || true

# Coturn
docker run -d --name livego-coturn --network livego_livego-network --restart unless-stopped \
  -p 3478:3478/tcp -p 3478:3478/udp \
  -e TURN_USERNAME=turnuser -e TURN_PASSWORD=cduPU3djAxZ1pyyg \
  -e TURN_REALM=livego -e TURN_TTL=86400 \
  -v /var/www/livego/coturn.conf:/etc/coturn/turnserver.conf \
  coturn/coturn:latest

# Backend
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

# SRS
docker run -d --name livego-srs --network livego_livego-network --restart unless-stopped \
  -p 1935:1935 -p 1985:1985 -p 8080:8080 -p 8000:8000/udp -p 10080:10080/udp \
  -e CANDIDATE=72.60.249.175 -e SRS_DAEMON=off -e SRS_IN_DOCKER=on \
  -v /var/www/livego/srs/trunk/conf/docker.conf:/usr/local/srs/conf/docker.conf:ro \
  livego-srs

# Nginx
docker run -d --name livego-nginx --network livego_livego-network --restart unless-stopped \
  -p 80:80 -p 443:443 \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  -v /var/www/livego/nginx/conf/livego-integrated.conf:/etc/nginx/conf.d/default.conf:ro \
  -v livego_uploads_data:/var/www/livego/uploads:ro \
  livego-nginx
```

### 5. Verificar

```bash
sleep 10
docker ps

# Health checks
curl https://api.livego.store/api/health
curl -I https://livego.store
curl http://localhost:1985/api/v1/versions
```

---

## ⚙️ Manutenção

### Logs
```bash
docker logs livego-backend -f
docker logs livego-srs -f
docker logs livego-nginx -f
```

### Atualizar
```bash
cd /var/www/livego
git pull
git submodule update --recursive
docker rm -f livego-backend livego-nginx 2>/dev/null
docker build -t livego-backend ./backend
docker build -t livego-nginx -f nginx/Dockerfile .
docker run -d --name livego-backend ... (mesmos parametros)
docker run -d --name livego-nginx ... (mesmos parametros)
```

### Editar config sem rebuild
```bash
# Nginx
nano nginx/conf/livego-integrated.conf
docker exec livego-nginx nginx -s reload

# SRS
nano srs/trunk/conf/docker.conf
docker restart livego-srs

# Coturn
nano coturn.conf
docker restart livego-coturn
```

### SSL (renovação automática)
```bash
certbot renew
docker exec livego-nginx nginx -s reload
```

---

## 🏗️ Arquitetura

```
                    HTTPS                          HTTP/Docker
Browser ──► livego.store ──► nginx:443 ──► backend:3000 (API)
                │                              │
                │                         backend:3001 (WebSocket)
                │                              │
                │                         mongodb:27017
                │
                ├──► SRS:8000 (WebRTC UDP)
                ├──► SRS:1985 (WebRTC signaling via backend)
                └──► Coturn:3478 (STUN/TURN)

SRS callbacks ──► backend:3000/api/srs/* (Docker DNS interno)
```

### Containers
| Nome | Função | Portas |
|---|---|---|
| `livego-mongodb` | Banco de dados | 27017 |
| `livego-coturn` | STUN/TURN | 3478 |
| `livego-backend` | API + WebSocket | 3000, 3001 |
| `livego-srs` | Media Server | 1935, 1985, 8080, 8000/udp |
| `livego-nginx` | Proxy + Frontend | 80, 443 |
| `livego-init-db` | Bootstrap (one-shot) | - |

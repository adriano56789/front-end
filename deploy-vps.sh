#!/bin/bash
set -euo pipefail

REPO="git@github.com:adriano56789/livego.git"
DIR="/var/www/livego"

info()  { echo -e "\033[0;32m[INFO]\033[0m $1"; }
err()   { echo -e "\033[0;31m[ERR]\033[0m $1"; }
ok()    { echo -e "\033[0;32m[OK]\033[0m $1"; }

info "=== LIVEGO DEPLOY ==="
[ "$EUID" = "0" ] || { err "Execute como root"; exit 1; }

info "[1/5] Instalando dependencias..."
apt update -qq && apt install -y -qq git curl certbot docker-compose-plugin 2>/dev/null || true
ok "Dependencias OK"

info "[2/5] Clonando/atualizando repositorio..."
if [ -d "$DIR/.git" ]; then
    cd "$DIR"
    
    git fetch origin main
    git reset --hard origin/main
    git clean -fd
else
    rm -rf "$DIR"
    git clone "$REPO" "$DIR"
fi
cd "$DIR"
ok "Repositorio atualizado (commit: $(git log --oneline -1))"

info "[3/5] Parando containers para liberar portas..."
docker compose down --remove-orphans 2>/dev/null || true
ok "Containers parados"

info "[4/5] SSL Let's Encrypt..."
for domain in livego.store api.livego.store; do
    if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
        certbot renew --non-interactive --quiet 2>/dev/null || true
    else
        certbot certonly --standalone -d "$domain" --email adrianomdk5@gmail.com --agree-tos --non-interactive 2>/dev/null || true
    fi
done
ok "SSL OK"

info "[5/5] Subindo containers com build fresco..."
docker compose build --no-cache 2>&1 | tail -5
docker compose up -d --force-recreate
ok "Containers rodando"

echo ""
info "=== STATUS ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Health check com retry
sleep 5

check_url() {
    local name="$1" url="$2" max=6 delay=5
    for i in $(seq 1 $max); do
        if curl -sf "$url" > /dev/null 2>&1; then
            ok "$name: $url"
            return 0
        fi
        [ $i -lt $max ] && sleep $delay
    done
    err "$name NAO RESPONDE - $url"
}

check_url "Front-end" "https://livego.store"
check_url "API" "https://api.livego.store/api/health" || check_url "API" "https://livego.store/api/health"
check_url "SRS HTTP API" "http://72.60.249.175:1985/api/v1/versions"

# Limpeza
docker image prune -f 2>/dev/null || true
docker builder prune -f 2>/dev/null || true
ok "Imagens e cache Docker limpos"

echo ""
info "Logs: docker compose logs -f"
info "Reiniciar: docker compose restart"

#!/bin/bash
# ===========================================================================
# LiveGo — Deploy de Infraestrutura (VPS)
# Sobe apenas: Nginx + SRS + Signaling + EMQX
# Sem backend, frontend, banco de dados 
# ===========================================================================
set -euo pipefail

# ─── Cores ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Configurações ─────────────────────────────────────────────────────────
DOMAIN="${DOMAIN:-livego.store}"
SRS_IP="${SRS_IP:-72.60.249.175}"
REPO_URL="${REPO_URL:-https://github.com/adriano56789/livego.git}"
BRANCH="${BRANCH:-main}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/livego}"

EMQX_ADMIN_PASSWORD="${EMQX_ADMIN_PASSWORD:-$(openssl rand -base64 18)}"

COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
ENV_FILE="${DEPLOY_DIR}/.env"

# ─── 1. Pré-requisitos ────────────────────────────────────────────────────
echo -e "\n${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  LiveGo — Deploy de Infraestrutura${NC}"
echo -e "${CYAN}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}\n"

info "Verificando pré-requisitos..."

# Docker
if ! command -v docker &>/dev/null; then
  warn "Docker não encontrado. Instalando..."
  curl -fsSL https://get.docker.com | bash
  sudo usermod -aG docker "$USER"
  ok "Docker instalado"
else
  ok "Docker $(docker --version)"
fi

# Docker Compose
if ! docker compose version &>/dev/null; then
  err "Docker Compose não disponível. Instale manualmente."
  exit 1
fi
ok "Docker Compose $(docker compose version --short 2>/dev/null || echo 'ok')"

# Git
if ! command -v git &>/dev/null; then
  warn "Git não encontrado. Instalando..."
  sudo apt-get update -qq && sudo apt-get install -y -qq git
  ok "Git instalado"
else
  ok "Git $(git --version 2>/dev/null | head -1)"
fi

# Certbot / OpenSSL
HAS_CERTBOT=false
if command -v certbot &>/dev/null; then
  HAS_CERTBOT=true
  ok "Certbot disponível"
else
  warn "Certbot não encontrado. Usando self-signed para SSL."
fi

if ! command -v openssl &>/dev/null; then
  warn "OpenSSL não encontrado. Instalando..."
  sudo apt-get update -qq && sudo apt-get install -y -qq openssl
fi
ok "OpenSSL disponível"

# ─── 2. Clonar / Atualizar repositório ────────────────────────────────────
echo
info "Preparando repositório em ${DEPLOY_DIR}..."

if [[ -d "${DEPLOY_DIR}/.git" ]]; then
  info "Repositório já existe. Atualizando..."
  cd "${DEPLOY_DIR}"
  git fetch origin "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
  ok "Repositório atualizado (branch ${BRANCH})"
else
  info "Clonando repositório..."
  git clone --branch "${BRANCH}" --depth 1 "${REPO_URL}" "${DEPLOY_DIR}"
  ok "Repositório clonado (branch ${BRANCH})"
fi

cd "${DEPLOY_DIR}"

# ─── 3. Criar diretórios necessários ──────────────────────────────────────
echo
info "Criando diretórios..."
mkdir -p backend dist
ok "Diretórios prontos"

# ─── 4. Certificados SSL ──────────────────────────────────────────────────
echo
info "Configurando certificados SSL..."

CERT_SRC="${DEPLOY_DIR}/backend/cert.pem"
KEY_SRC="${DEPLOY_DIR}/backend/key.pem"

install_cert() {
  local cert_file="$1" key_file="$2"
  cp -f "$cert_file" "$CERT_SRC"
  cp -f "$key_file" "$KEY_SRC"
  chmod 644 "$CERT_SRC"
  chmod 600 "$KEY_SRC"
  ok "Certificados instalados"
}

if [[ -f "$CERT_SRC" && -f "$KEY_SRC" ]]; then
  ok "Certificados já existem. Reutilizando."
elif $HAS_CERTBOT; then
  info "Obtendo certificados Let's Encrypt para ${DOMAIN}..."
  if sudo certbot certonly --standalone --non-interactive --agree-tos \
    --email "admin@${DOMAIN}" \
    -d "${DOMAIN}" -d "www.${DOMAIN}" -d "api.${DOMAIN}" \
    --http-01-port 80 2>/dev/null; then
    install_cert \
      "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" \
      "/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

    # Configurar renovação automática
    info "Configurando renovação automática via systemd..."
    if ! systemctl list-timers | grep -q certbot; then
      echo '#!/bin/sh
docker cp /etc/letsencrypt '"${DEPLOY_DIR}"'/backend/
docker compose -f '"${COMPOSE_FILE}"' exec nginx nginx -s reload' | \
        sudo tee /etc/letsencrypt/renewal-hooks/deploy/livego.sh >/dev/null
      sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/livego.sh
    fi
    ok "Let's Encrypt configurado com renovação automática"
  else
    warn "Falha ao obter Let's Encrypt. Gerando self-signed..."
    generate_self_signed
  fi
else
  info "Gerando certificado self-signed..."
  generate_self_signed
fi

generate_self_signed() {
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "${KEY_SRC}" \
    -out "${CERT_SRC}" \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=LiveGo/CN=${DOMAIN}" 2>/dev/null
  chmod 644 "${CERT_SRC}"
  chmod 600 "${KEY_SRC}"
  ok "Certificado self-signed gerado"
}

# ─── 5. Firewall ──────────────────────────────────────────────────────────
echo
info "Configurando firewall (portas necessárias)..."

PORTS_NEEDED=(80 443 1935 8000 18083)
PORTS_DESC=("HTTP (Let's Encrypt)" "HTTPS (WebRTC/HLS/API)" "RTMP (publish)" "WebRTC/UDP (media)" "EMQX Admin")

if command -v ufw &>/dev/null; then
  for i in "${!PORTS_NEEDED[@]}"; do
    port="${PORTS_NEEDED[$i]}"
    desc="${PORTS_DESC[$i]}"
    if [[ $port -eq 8000 ]]; then
      proto="udp"
    else
      proto="tcp"
    fi
    if ! ufw status verbose | grep -q "${port}/${proto}"; then
      sudo ufw allow "${port}/${proto}" comment "${desc}" >/dev/null 2>&1
      ok "Porta ${port}/${proto} liberada (${desc})"
    else
      ok "Porta ${port}/${proto} já liberada"
    fi
  done
  sudo ufw --force enable >/dev/null 2>&1
  ok "Firewall UFW ativado"
else
  warn "UFW não encontrado. Instale com: apt install ufw"
  info "Portas necessárias: ${PORTS_NEEDED[*]} (TCP, exceto 8000/UDP)"
fi

# ─── 6. Ambiente ──────────────────────────────────────────────────────────
echo
info "Configurando variáveis de ambiente..."

cat > "${ENV_FILE}" <<EOF
# LiveGo — Produção
CANDIDATE=${SRS_IP}
NGINX_HTTP_PORT=${NGINX_HTTP_PORT:-80}
NGINX_HTTPS_PORT=${NGINX_HTTPS_PORT:-443}
EMQX_ADMIN_PASSWORD=${EMQX_ADMIN_PASSWORD}
EOF

ok "Arquivo .env criado em ${ENV_FILE}"

# ─── 7. Verificar SRS config ─────────────────────────────────────────────
echo
info "Verificando configuração do SRS..."

SRS_CONF="${DEPLOY_DIR}/srs/trunk/conf/srs.conf"
if grep -q "rtc_group_policy" "$SRS_CONF" 2>/dev/null; then
  warn "Removendo diretiva inválida 'rtc_group_policy' do srs.conf..."
  sed -i '/rtc_group_policy/d' "$SRS_CONF"
  ok "srs.conf corrigido"
else
  ok "srs.conf OK"
fi

# ─── 8. Pull das imagens ──────────────────────────────────────────────────
echo
info "Baixando imagens Docker..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull
ok "Imagens atualizadas"

# ─── 9. Subir serviços ────────────────────────────────────────────────────
echo
info "Iniciando serviços de infraestrutura..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d \
  signaling srs nginx emqx
ok "Serviços iniciados"

# ─── 10. Verificação ──────────────────────────────────────────────────────
echo
info "Verificando status dos containers..."
sleep 3

ALL_OK=true
for svc in signaling srs nginx emqx; do
  status=$(docker inspect "livego-${svc}" --format '{{.State.Status}}' 2>/dev/null || echo "missing")
  health=$(docker inspect "livego-${svc}" --format '{{.State.Health.Status}}' 2>/dev/null || echo "N/A")

  if [[ "$status" == "running" ]]; then
    ok "livego-${svc}  → ${status} (health: ${health})"
  else
    err "livego-${svc}  → ${status}"
    ALL_OK=false
  fi
done

# ─── 11. Resumo ──────────────────────────────────────────────────────────
if [[ -z "${DOMAIN:-}" && -z "${SRS_IP:-}" ]]; then
  err "DOMAIN e SRS_IP não definidos. Configure ambos no .env ou exporte antes de executar."
  err "Exemplo: export DOMAIN=livego.store SRS_IP=72.60.249.175"
  exit 1
fi
_DOMAIN="${DOMAIN:-${SRS_IP}}"
_SRS_IP="${SRS_IP:-${DOMAIN}}"

echo
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  LiveGo — Deploy concluído${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo
echo -e "  ${CYAN}▶ Streaming (Publicação)${NC}"
echo "    RTMP:   rtmp://${_SRS_IP}:1935/live/{stream}"
echo "    WHIP:   https://${_DOMAIN}/rtc/v1/whip/?app=live\&stream={stream}"
echo
echo -e "  ${CYAN}▶ Playback${NC}"
echo "    WHEP:   https://${_DOMAIN}/rtc/v1/whep/?app=live\&stream={stream}"
echo "    HLS:    https://${_DOMAIN}/live/{stream}.m3u8"
echo "    FLV:    https://${_DOMAIN}/live/{stream}.flv"
echo
echo -e "  ${CYAN}▶ Administração${NC}"
echo "    SRS Console: https://${_DOMAIN}/srs/"
echo "    EMQX Admin:  http://${_SRS_IP}:18083  (admin / ********)"
echo "    MQTT:        wss://${_DOMAIN}/mqtt/"
echo
echo "  .env:  ${ENV_FILE}"
echo

if $ALL_OK; then
  echo -e "  ${GREEN}✓ Todos os serviços estão rodando.${NC}"
else
  echo -e "  ${RED}✗ Alguns serviços falharam. Verifique com 'docker compose logs'.${NC}"
fi
echo

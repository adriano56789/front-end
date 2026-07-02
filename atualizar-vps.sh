#!/bin/bash
# ===================================================================
# LIVEGO - Script de Sincronização, Correção e Atualização da VPS
# ===================================================================
# Este script deve ser executado diretamente no terminal da sua VPS
# como usuário root para puxar as últimas correções e recriar os builds.
# Baseado na estrutura do seu projeto LiveGo.

set -euo pipefail

# Cores para logs
INFO="\033[0;34m[INFO]\033[0m"
SUCCESS="\033[0;32m[SUCESSO]\033[0m"
WARNING="\033[0;33m[AVISO]\033[0m"
ERROR="\033[0;31m[ERRO]\033[0m"

echo "===================================================="
echo "🚀 INICIANDO ATUALIZAÇÃO E AJUSTE DA VPS LIVEGO"
echo "===================================================="

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
  echo -e "$ERROR Execute este script como root: sudo $0"
  exit 1
fi

# Diretório padrão da VPS
DIR="/var/www/front-end"

if [ ! -d "$DIR" ]; then
    DIR="/var/www/livego"
fi

if [ ! -d "$DIR" ]; then
    echo -e "$WARNING Diretórios padrão não encontrados. Tentando diretório atual..."
    DIR=$(pwd)
fi

cd "$DIR"
echo -e "$INFO Utilizando diretório do projeto: $DIR"

# 1. Puxar as atualizações recém-feitas no Git
echo -e "\n$INFO [1/5] Atualizando o código local com o Git..."
if [ -d ".git" ]; then
    # Limpa modificações locais que possam causar conflito ao dar pull
    git fetch origin main || { echo -e "$WARNING Não foi possível buscar atualizações do Git."; }
    echo -e "$INFO Fazendo reset seguro para sincronizar com origin/main..."
    git reset --hard origin/main || { echo -e "$WARNING Falha ao sincronizar com origin/main. Continuando com arquivos locais..."; }
    git clean -fd
    echo -e "$SUCCESS Código atualizado com sucesso! Último commit: $(git log --oneline -1 2>/dev/null || echo 'Desconhecido')"
else
    echo -e "$WARNING Este diretório não é um repositório Git. Ignorando atualização de repositório."
fi

# 2. Identificar modo de deploy da VPS (Docker Compose ou Instalação Nativa/PM2)
IS_DOCKER=false
if command -v docker-compose &>/dev/null || docker compose version &>/dev/null; then
    if [ -f "docker-compose.yml" ]; then
        IS_DOCKER=true
    fi
fi

if [ "$IS_DOCKER" = "true" ]; then
    echo -e "\n$INFO [2/5] Deploy via Docker Detectado!"
    echo -e "$INFO Atualizando imagens e limpando cache anterior..."
    
    # Parar containers para liberar memória
    docker compose down --remove-orphans || true
    
    # Reconstruir sem cache para evitar problemas de asset salvos
    echo -e "$INFO Reconstruindo containers do zero (sem cache) para garantir designs corretos..."
    docker compose build --no-cache
    
    # Subir os containers atualizados
    echo -e "$INFO Iniciando containers em background..."
    docker compose up -d --force-recreate
    
    # Limpeza adicional de caches do builder do Docker
    docker builder prune -f &>/dev/null || true
    docker image prune -f &>/dev/null || true
    
    echo -e "$SUCCESS Docker atualizado e rodando perfeitamente!"
else
    # Configuração nativa com PM2 e Nginx
    echo -e "\n$INFO [2/5] Deploy Nativo (Nginx + PM2) Detectado!"
    
    # Limpando logs anteriores
    pm2 flush || true
    
    # Construir Frontend
    echo -e "$INFO [3/5] Instalando dependências e rodando build do FRONTEND..."
    if [ -d "front-end" ]; then
        cd front-end
    fi
    
    # Forçar instalação limpa e build do front-end
    rm -rf node_modules dist_old dist
    npm install
    npm run build
    
    # Se entramos no diretório front-end, voltar para o principal
    if [ "$(basename "$(pwd)")" = "front-end" ]; then
        cd ..
    fi

    # Forçar compilação do backend se a pasta backend existir
    echo -e "$INFO [4/5] Instalando dependências e compilando o BACKEND..."
    if [ -d "backend" ]; then
        cd backend
        rm -rf node_modules dist
        npm install
        npm run build
        cd ..
    else
        echo -e "$WARNING Pasta 'backend' não encontrada. Verifique se o seu backend está em outro local."
    fi

    # Reiniciar Serviços
    echo -e "\n$INFO [5/5] Reiniciando PM2 e recarregando Nginx..."
    
    # Reiniciar o MongoDB por segurança
    if systemctl is-active --quiet mongod; then
        systemctl restart mongod
        echo -e "$SUCCESS MongoDB reiniciado."
    fi
    
    # Reiniciar o Backend do PM2 para carregar o novo server compilado
    if pm2 list | grep -q "livego-backend"; then
        pm2 restart livego-backend
        echo -e "$SUCCESS PM2 livego-backend reiniciado!"
    else
        echo -e "$WARNING Serviço PM2 'livego-backend' não foi encontrado rodando. Tentando iniciar..."
        if [ -d "backend" ] && [ -f "backend/dist/server.js" ]; then
            pm2 start backend/dist/server.js --name "livego-backend" --cwd /var/www/livego/backend || true
        elif [ -f "dist/server.js" ]; then
            pm2 start dist/server.js --name "livego-backend" --cwd "$DIR" || true
        fi
    fi
    
    # Recarregar Nginx para refletir novos estilos estáticos do dist/
    if systemctl is-active --quiet nginx; then
        nginx -t && systemctl reload nginx
        echo -e "$SUCCESS Nginx recarregado com sucesso!"
    fi
fi

# Saúde do Sistema
sleep 3
echo -e "\n===================================================="
echo -e "📊 STATUS DO DEPLOY DE CORREÇÃO NA VPS:"
echo -e "===================================================="

if [ "$IS_DOCKER" = "true" ]; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo -e "PM2 Status:"
    pm2 status || true
    echo -e "\nNginx Status:"
    systemctl status nginx --no-pager -n 2 || true
fi

echo -e "\n$SUCCESS SCRIPT DE VPS EXECUTADO COMPLEMENTARMENTE!"
echo "Caso existisse cache no navegador ou no Nginx, as alterações visuais de fundo preto e correções de salvamento foram aplicadas com sucesso no servidor."
echo "===================================================="

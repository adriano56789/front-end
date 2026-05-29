#!/bin/bash

echo "🚀 DEPLOY PARA VPS - ENVIANDO ARQUIVOS JSON\n"

# Configurações da VPS
VPS_IP="72.60.249.175"
VPS_USER="root"
VPS_PATH="/var/www/livego"

# Lista de arquivos JSON para enviar
JSON_FILES=(
    "api.json/api.users.json"
    "api.json/api.gifts.json"
    "api.json/api.streamers.json"
    "api.json/api.streams.json"
    "api.json/api.chats.json"
    "api.json/api.messages.json"
    "api.json/api.conversations.json"
    "api.json/api.follows.json"
    "api.json/api.blocks.json"
    "api.json/api.photos.json"
    "api.json/api.profilephotos.json"
    "api.json/api.visitors.json"
    "api.json/api.birthdays.json"
    "api.json/api.bannedentities.json"
    "api.json/api.beautyeffects.json"
    "api.json/api.beautysettings.json"
    "api.json/api.frames.json"
    "api.json/api.shopitems.json"
    "api.json/api.orders.json"
    "api.json/api.purchaserecords.json"
    "api.json/api.withdrawals.json"
    "api.json/api.useractivities.json"
    "api.json/api.userindexes.json"
    "api.json/api.userphotos.json"
    "api.json/api.useravatars.json"
    "api.json/api.userlevels.json"
    "api.json/api.userframes.json"
    "api.json/api.userinventories.json"
    "api.json/api.userstatuses.json"
    "api.json/api.uservideos.json"
    "api.json/api.invitations.json"
    "api.json/api.manualtransmissaos.json"
    "api.json/api.streamhistories.json"
    "api.json/api.streamkeyassociations.json"
    "api.json/api.streamlikes.json"
    "api.json/api.streamsessions.json"
    "api.json/api.giftnotificationsettings.json"
    "api.json/api.gifttransactions.json"
    "api.json/api.friendships.json"
    "api.json/api.comments.json"
    "api.json/api.chatmessages.json"
    "api.json/api.profileupdates.json"
    "api.json/api.appversions.json"
)

echo "📋 Total de arquivos JSON: ${#JSON_FILES[@]}"

# Criar diretório temporário para os arquivos
TEMP_DIR="/tmp/livego-json-$(date +%s)"
mkdir -p "$TEMP_DIR"

# Copiar arquivos JSON para o diretório temporário
echo "📁 Preparando arquivos JSON..."
for json_file in "${JSON_FILES[@]}"; do
    if [ -f "$json_file" ]; then
        filename=$(basename "$json_file")
        cp "$json_file" "$TEMP_DIR/$filename"
        echo "✅ Copiado: $filename"
    else
        echo "❌ Não encontrado: $json_file"
    fi
done

# Compactar arquivos
echo "📦 Compactando arquivos JSON..."
cd "$TEMP_DIR"
tar -czf livego-json-files.tar.gz *.json

# Enviar para VPS
echo "📤 Enviando arquivos para VPS ($VPS_IP)..."
scp livego-json-files.tar.gz "$VPS_USER@$VPS_IP:/tmp/"

# Executar comandos na VPS
echo "🔧 Executando comandos na VPS..."
ssh "$VPS_USER@$VPS_IP" << 'EOF'
    # Entrar no diretório do projeto
    cd /var/www/livego
    
    # Descompactar arquivos JSON
    echo "📦 Descompactando arquivos JSON..."
    cd /tmp
    tar -xzf livego-json-files.tar.gz
    
    # Mover arquivos JSON para o diretório permanente
    echo "📁 Movendo arquivos JSON..."
    mkdir -p /var/www/livego/api.json
    cp /tmp/*.json /var/www/livego/api.json/
    
    # Restaurar dados no MongoDB (idempotente — só importa se vazio)
    echo "🗄️ Verificando seed do banco de dados..."
    cd /var/www/livego
    MONGODB_URI="mongodb://localhost:27017/api?authSource=admin" \
    SEED_DATA_DIR="/var/www/livego/api.json" \
    node backend/scripts/seed-once.js
    
    # Limpar arquivos temporários
    echo "🧹 Limpando arquivos temporários..."
    rm -rf /tmp/livego-json-*
    rm -f /tmp/livego-json-files.tar.gz
    
    # Reiniciar backend
    echo "🔄 Reiniciando backend..."
    pm2 restart livego-backend
    
    echo "✅ DEPLOY CONCLUÍDO!"
EOF

# Limpar arquivos temporários locais
echo "🧹 Limpando arquivos temporários locais..."
rm -rf "$TEMP_DIR"

echo ""
echo "🎯 DEPLOY CONCLUÍDO COM SUCESSO!"
echo "📊 Arquivos JSON enviados para VPS"
echo "🗄️ Dados restaurados no MongoDB livego"
echo "🔄 Backend reiniciado"

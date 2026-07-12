#!/bin/bash
# ================================================================
# SETUP DAS ANIMAÇÕES DOS PRESENTES (6 VÍDEOS PIXVERSE)
# ================================================================

set -e

MONGO_URI="mongodb://admin:adriano123@127.0.0.1:27017/api?authSource=admin"
ANIMATIONS_DIR="/var/www/livego.store/uploads/animations"
ANIMATIONS_URL="/uploads/animations"

echo "=========================================="
echo "  SETUP DAS ANIMAÇÕES DOS PRESENTES"
echo "=========================================="

# ── 1. Criar diretório ──
echo ""
echo "[1/4] Criando diretório de animações..."
mkdir -p "$ANIMATIONS_DIR"
chmod 755 "$ANIMATIONS_DIR"
echo "✅ Diretório: $ANIMATIONS_DIR"

# ── 2. Configurar nginx ──
echo ""
echo "[2/4] Configurando nginx..."

NGINX_CONF="/etc/nginx/sites-available/livego"

if grep -q "uploads/animations" "$NGINX_CONF" 2>/dev/null; then
    echo "✅ Nginx já configurado"
else
    sed -i '/try_files \$uri \$uri\//a\
\
    location /uploads/animations/ {\
        root /var/www/livego.store;\
        add_header Access-Control-Allow-Origin *;\
        expires 30d;\
        add_header Cache-Control "public, immutable";\
        types {\
            video/webm webm;\
            video/mp4 mp4;\
        }\
    }' "$NGINX_CONF"

    nginx -t && systemctl reload nginx
    echo "✅ Nginx configurado"
fi

# ── 3. Upload instruções ──
echo ""
echo "[3/4] Para enviar os vídeos, execute no seu computador:"
echo ""
echo "--- COPIAR ESTE BLOCO ---"
echo 'REM nomeie cada vídeo pelo ID do presente antes de enviar'
echo "scp \"C:/Users/adria/Videos/Bandicam/PixVerse_V6_Image_Text_360P_Crie_uma_animacão_.webm\" root@2.25.192.154:$ANIMATIONS_DIR/explosao_confete.webm"
echo "scp \"C:/Users/adria/Videos/Bandicam/PixVerse_V6_Image_Text_360P_Crie_uma_animacão_-_1__1.webm\" root@2.25.192.154:$ANIMATIONS_DIR/coracao_gigante.webm"
echo "scp \"C:/Users/adria/Videos/Bandicam/PixVerse_V6_Image_Text_360P_Crie_uma_animacão_-_2__1.webm\" root@2.25.192.154:$ANIMATIONS_DIR/show_de_luzes.webm"
echo "scp \"C:/Users/adria/Videos/Bandicam/PixVerse_V6_Image_Text_360P_Crie_uma_animacão_-_4_.webm\" root@2.25.192.154:$ANIMATIONS_DIR/portal_galactico.webm"
echo "scp \"C:/Users/adria/Videos/Bandicam/PixVerse_V6_Image_Text_360P_CENA_1__FRAME_FINA (1).webm\" root@2.25.192.154:$ANIMATIONS_DIR/chuva_de_rosas.webm"
echo "scp \"C:/Users/adria/Videos/Bandicam/Um-pirulito-colorido-gigante-aparece-no-centro-através-de-um-portal-de-açúcar-brilhante_-girando-em- (1).webm\" root@2.25.192.154:$ANIMATIONS_DIR/pirulito.webm"
echo "--- FIM DO BLOCO ---"
echo ""

# ── 4. Atualizar MongoDB ──
echo ""
echo "[4/4] Atualizando MongoDB..."

mongosh "$MONGO_URI" --quiet --eval "

const updates = {
    'pirulito':           '$ANIMATIONS_URL/pirulito.webm',
    'explosao_de_confete':'$ANIMATIONS_URL/explosao_confete.webm',
    'coracao_gigante':    '$ANIMATIONS_URL/coracao_gigante.webm',
    'show_de_luzes':      '$ANIMATIONS_URL/show_de_luzes.webm',
    'portal_galactico':   '$ANIMATIONS_URL/portal_galactico.webm',
    'chuva_de_rosas':     '$ANIMATIONS_URL/chuva_de_rosas.webm',
};

let updated = 0;
let notFound = [];

for (const [giftId, animationUrl] of Object.entries(updates)) {
    const result = db.gifts.updateOne(
        { id: giftId },
        { \$set: { animationUrl: animationUrl, duration: 5000 } }
    );
    if (result.matchedCount > 0) {
        print('✅ ' + giftId + ' → animationUrl atualizado');
        updated++;
    } else {
        notFound.push(giftId);
        print('⚠️  ' + giftId + ' → não encontrado');
    }
}

print('');
print('✅ Atualizados: ' + updated);
print('❌ Não encontrados: ' + (notFound.length ? notFound.join(', ') : 'nenhum'));

// Listar gifts da categoria Efeito que ainda não tem animação
const semAnimacao = db.gifts.find({
    category: 'Efeito',
    animationUrl: { \$exists: false }
}).toArray();
if (semAnimacao.length > 0) {
    print('');
    print('Efeitos SEM animação (' + semAnimacao.length + '):');
    semAnimacao.forEach(g => print('   - ' + g.id + ' (' + g.name + ')'));
}
"

echo ""
echo "=========================================="
echo "  SETUP CONCLUÍDO!"
echo "=========================================="
echo ""
echo "📌 Depois de enviar os vídeos com scp,"
echo "   os gifts vão reproduzir as animações automaticamente!"
echo ""

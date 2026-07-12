#!/bin/bash
# ================================================================
# ATUALIZAR animationUrl NO BANCO DE DADOS
# Execute na VPS após enviar os vídeos com upload-animations.ps1
# ================================================================

MONGO_URI="mongodb://admin:adriano123@127.0.0.1:27017/api?authSource=admin"
BASE_URL="/uploads/animations"

echo "Atualizando MongoDB..."

mongosh "$MONGO_URI" --quiet --eval "

const updates = {
    'pirulito':           '$BASE_URL/pirulito.webm',
    'explosao_de_confete':'$BASE_URL/explosao_confete.webm',
    'coracao_gigante':    '$BASE_URL/coracao_gigante.webm',
    'show_de_luzes':      '$BASE_URL/show_de_luzes.webm',
    'portal_galactico':   '$BASE_URL/portal_galactico.webm',
    'chuva_de_rosas':     '$BASE_URL/chuva_de_rosas.webm',
};

let updated = 0;
for (const [id, url] of Object.entries(updates)) {
    const r = db.gifts.updateOne({ id }, { \$set: { animationUrl: url, duration: 5000 } });
    if (r.matchedCount > 0) { print('✅ ' + id); updated++; }
    else { print('⚠️  ' + id + ' não encontrado'); }
}
print('');
print('Atualizados: ' + updated + ' / ' + Object.keys(updates).length);
"

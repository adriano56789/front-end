// FCM v1 reserva a chave "from" — remover do data payload no sanitizeData.
const fs = require('fs');

const TARGET = '/app/backend/src/services/firebaseService.ts';
let src = fs.readFileSync(TARGET, 'utf8');
let changed = 0;

// 1) sanitizeData: pular a chave "from" (reservada pelo FCM v1)
const oldSan = `  for (const [key, value] of Object.entries(data)) {
    // Remove chaves de imagem/avatar/ícone (nunca trafegam no push)
    if (IMAGE_LIKE_FIELD.test(key)) continue;`;
const newSan = `  for (const [key, value] of Object.entries(data)) {
    // 🔑 "from" é chave RESERVADA do FCM v1 (erro "Invalid data payload key: from").
    // O remetente vai em senderId/fromUserName — remover "from" aqui.
    if (key === 'from') continue;
    // Remove chaves de imagem/avatar/ícone (nunca trafegam no push)
    if (IMAGE_LIKE_FIELD.test(key)) continue;`;

if (src.includes(oldSan)) {
  src = src.replace(oldSan, newSan);
  changed++;
  console.log('[1] sanitizeData: chave "from" removida do payload');
} else if (src.includes("key === 'from'")) {
  console.log('[1] ✓ já aplicado');
} else {
  console.log('[1] ✗ padrão não encontrado');
}

if (changed || src !== fs.readFileSync(TARGET, 'utf8')) {
  fs.writeFileSync(TARGET, src);
}
console.log(`Total: ${changed}`);
process.exit(0);

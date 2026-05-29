const fs = require('fs');
const path = require('path');

// Desabilitar tratamento como módulo ES6
require = require;

// Verificar argumento de linha de comando
const targetEnv = process.argv[2];

if (!targetEnv || (targetEnv !== 'dev' && targetEnv !== 'prod')) {
  console.log('❌ Uso: node switch-env.js [dev|prod]');
  console.log('   dev  - Configura ambiente de desenvolvimento (localhost)');
  console.log('   prod - Configura ambiente de produção (VPS)');
  process.exit(1);
}

// Caminhos dos arquivos
const envDevPath = path.join(__dirname, '../.env.development');
const envProdPath = path.join(__dirname, '../.env.prod');
const envPath = path.join(__dirname, '../.env');

// Verificar se o arquivo de ambiente existe
const sourceFile = targetEnv === 'dev' ? envDevPath : envProdPath;

if (!fs.existsSync(sourceFile)) {
  console.log(`❌ Arquivo .env.${targetEnv} não encontrado em: ${sourceFile}`);
  process.exit(1);
}

try {
  // Copiar arquivo de ambiente para .env
  fs.copyFileSync(sourceFile, envPath);
  
  console.log(`✅ Ambiente trocado para: ${targetEnv.toUpperCase()}`);
  console.log(`📁 Arquivo copiado: .env.${targetEnv} → .env`);
  console.log('');
  console.log('🔗 Configurações ativas:');
  
  if (targetEnv === 'dev') {
    console.log('   🏠 Backend: http://localhost:3000');
    console.log('   🌐 Frontend: http://localhost:5173');
    console.log('   📸 Uploads: http://localhost:3000/uploads/');
    console.log('   🗄️ MongoDB: localhost:27017');
  } else {
    console.log('   🚀 Backend: https://api.livego.store');
    console.log('   🌐 Frontend: https://livego.store');
    console.log('   📸 Uploads: https://api.livego.store/uploads/');
    console.log('   🗄️ MongoDB: localhost:27017 (banco local)');
  }
  
  console.log('');
  console.log('⚠️  Reinicie o backend para aplicar as mudanças!');
  
} catch (error) {
  console.error('❌ Erro ao trocar ambiente:', error.message);
  process.exit(1);
}

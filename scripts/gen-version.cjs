/**
 * gen-version.cjs — Gera um version.json NOVO (número de versão único) no dist.
 *
 * ⚠️ OBRIGATÓRIO em TODO deploy de frontend: o app compara a versão salva no
 * aparelho (localStorage) com a do servidor (/version.json). Se o número não
 * mudar, o app NUNCA sabe que houve atualização e continua na versão antiga.
 *
 * Formato: 1.0.YYMMDDHHMMSS (segundos!) — garante número diferente a cada
 * deploy, mesmo dois no mesmo minuto.
 *
 * Uso (CLI):
 *   node scripts/gen-version.cjs [caminho-do-dist]
 *   (default: ./dist)
 *
 * Uso (script):
 *   const { genVersion } = require('./scripts/gen-version.cjs');
 *   const version = genVersion('C:/caminho/para/dist');
 */
const fs = require('fs');
const path = require('path');

function genVersion(distPath) {
  const resolved = distPath ? path.resolve(distPath) : path.resolve(__dirname, '..', 'dist');

  if (!fs.existsSync(resolved)) {
    console.error('ERRO: pasta dist não existe:', resolved);
    process.exitCode = 1;
    return null;
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  // YYMMDDHHMMSS — inclui SEGUNDOS para nunca repetir o número, mesmo em
  // deploys seguidos no mesmo minuto.
  const build = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const versionInfo = {
    version: `1.0.${build}`,
    buildTime: now.toISOString(),
  };

  const target = path.join(resolved, 'version.json');
  fs.writeFileSync(target, JSON.stringify(versionInfo, null, 2));
  console.log(`✅ version.json gerado: ${versionInfo.version} → ${target}`);
  return versionInfo.version;
}

if (require.main === module) {
  genVersion(process.argv[2]);
}

module.exports = { genVersion };

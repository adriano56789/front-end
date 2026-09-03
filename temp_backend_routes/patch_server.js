// Patch script: adiciona 3 rotas novas no server.js
const fs = require('fs');
const path = '/app/dist/server.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Adicionar requires (depois do último require existente)
const requireBlock = `
const videoQualityRoutes_1 = __importDefault(require("./routes/videoQualityRoutes"));
const beautyStoreRoutes_1 = __importDefault(require("./routes/beautyStoreRoutes"));
const cohostRoutes_1 = __importDefault(require("./routes/cohostRoutes"));`;

if (!code.includes('videoQualityRoutes')) {
    code = code.replace(
        /const debugRoutes_1/,
        requireBlock + '\nconst debugRoutes_1'
    );
}

// 2. Adicionar app.use (antes da rota 404 final)
const useBlock = `
app.use('/api', videoQualityRoutes_1.default); // QUALIDADE DE VIDEO - resolução, denoise, nitidez
app.use('/api', beautyStoreRoutes_1.default); // BEAUTY STORE - estilo Tencent setSmooth/setWhiten/setRuddy
app.use('/api', cohostRoutes_1.default); // COHOST - conexão de co-host para PK/live conjunta`;

if (!code.includes('videoQualityRoutes_1.default')) {
    code = code.replace(
        /app\.use\('\/api\/\*'/,
        useBlock + "\n\napp.use('/api/*'"
    );
}

fs.writeFileSync(path, code);
console.log('✅ server.js patched - 3 novas rotas registradas');

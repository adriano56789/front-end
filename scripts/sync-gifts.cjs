/**
 * sync-gifts.cjs — Substitui a coleção `gifts` do MongoDB pelos presentes do
 * api.gifts.json (DELETE + INSERT), garantindo que o banco reflita EXATAMENTE
 * o seed (20 presentes, sem Atividade, um único Foguete).
 *
 * Uso (na VPS):
 *   cd /app/backend && docker exec -w /app/backend app-backend node sync-gifts.cjs
 *   # ou localmente (dev):
 *   node sync-gifts.cjs --file <caminho-api.gifts.json>
 *
 * O MONGODB_URI é lido de process.env; se ausente, tenta ler o .env do backend.
 */
const fs = require('fs');
const path = require('path');

function readEnv(file) {
  const out = {};
  try {
    const txt = fs.readFileSync(file, 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}

function loadMongoose() {
  const candidates = [
    path.resolve(process.cwd(), 'node_modules/mongoose'),
    '/app/backend/node_modules/mongoose',
    path.resolve(__dirname, 'node_modules/mongoose'),
  ];
  for (const c of candidates) {
    try { return require(c); } catch {}
  }
  throw new Error('mongoose não encontrado. Rode de dentro de /app/backend.');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { file: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) out.file = args[i + 1];
  }
  return out;
}

(async () => {
  const { file } = parseArgs();
  const seedPath = file || path.resolve(__dirname, 'api.gifts.json');
  if (!fs.existsSync(seedPath)) throw new Error('api.gifts.json não encontrado em: ' + seedPath);

  const uri =
    process.env.MONGODB_URI ||
    readEnv('/app/backend/.env').MONGODB_URI ||
    'mongodb://admin:adriano123@127.0.0.1:27017/api?authSource=admin';

  const mongoose = loadMongoose();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('[sync-gifts] Conectado ao MongoDB.');

  const col = mongoose.connection.collection('gifts');
  const docs = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const arr = Array.isArray(docs) ? docs : docs.data;

  // Converter _id em formato EJSON ({ $oid: "..." }) para ObjectId real,
  // senão o MongoDB rejeita com "$oid is not valid for storage".
  const normalize = (d) => {
    const copy = { ...d };
    if (copy._id && typeof copy._id === 'object' && copy._id.$oid) {
      copy._id = new mongoose.Types.ObjectId(copy._id.$oid);
    }
    return copy;
  };

  const before = await col.countDocuments({});
  await col.deleteMany({});
  const inserted = await col.insertMany(arr.map(normalize));

  const byCat = {};
  arr.forEach((g) => { byCat[g.category] = (byCat[g.category] || 0) + 1; });

  console.log('[sync-gifts] Removidos:', before, '| Inseridos:', inserted.length);
  console.log('[sync-gifts] Por categoria:', JSON.stringify(byCat));
  console.log('[sync-gifts] Foguetes:', arr.filter((g) => g.name === 'Foguete').length);
  console.log('[sync-gifts] Atividade:', arr.filter((g) => g.category === 'Atividade').length);

  await mongoose.disconnect();
  console.log('[sync-gifts] OK — coleção gifts sincronizada.');
})().catch((e) => {
  console.error('[sync-gifts] ERRO:', e.message);
  process.exit(1);
});

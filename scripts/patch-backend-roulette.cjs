/**
 * patch-backend-roulette.cjs — Corrige a roleta no backend da VPS.
 *
 * Problema: o espectador recebe o streamer do feed com id = streamKey, mas os
 * itens/custo da roleta ficam salvos no User do HOST (id = hostId). Resultado:
 * espectador via 0 itens e 0💎. A correção resolve o dono real (hostId) em
 * todas as rotas, mesmo quando chega o streamKey.
 *
 * Uso: node scripts/patch-backend-roulette.cjs
 */
const { Client } = require('ssh2');

const HOST = '2.25.192.154';
const USER = 'root';
const PASSWORD = process.env.VPS_PASS || 'MshrUfZrh09hWr#';
const FILE = '/app/backend/src/routes/rouletteRoutes.ts';

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
      finish(prompts.map(() => PASSWORD));
    });
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000, keepaliveInterval: 15000 });
  });
}

function sftpRead(sftp, remote) {
  return new Promise((resolve, reject) => sftp.readFile(remote, (err, data) => err ? reject(err) : resolve(data.toString('utf8'))));
}
function sftpWrite(sftp, remote, content) {
  return new Promise((resolve, reject) => sftp.writeFile(remote, Buffer.from(content, 'utf8'), (err) => err ? reject(err) : resolve()));
}

const PATCHES = [
  // 1. Helper resolveOwnerId
  {
    label: 'helper resolveOwnerId',
    old: `function isHostOwner(req: any, ownerId: string): boolean {
    const tokenUserId = getUserIdFromToken(req);
    return !!tokenUserId && String(tokenUserId) === String(ownerId);
}`,
    new: `function isHostOwner(req: any, ownerId: string): boolean {
    const tokenUserId = getUserIdFromToken(req);
    return !!tokenUserId && String(tokenUserId) === String(ownerId);
}

// 🔑 Resolve o ID REAL do dono da roleta (hostId). O frontend pode enviar
// ownerId = streamer.id, que na tela principal é o STREAMKEY da live — mas
// itens e custo ficam salvos no User do HOST (id = hostId). Sem essa resolução
// o espectador veria 0 itens e 0💎 (valor zerado). Busca o host pelo stream.
async function resolveOwnerId(ownerIdRaw: string): Promise<string> {
    const ownerId = String(ownerIdRaw || '').trim();
    if (!ownerId) return '';
    // Já é um id de usuário real? (caminho normal)
    const user = await User.findOne({ id: ownerId }).select('id').lean();
    if (user) return ownerId;
    // É streamKey/id/hostId de stream? Resolve para o host real
    const stream = await Streamer.findOne({
        $or: [{ id: ownerId }, { streamKey: ownerId }, { hostId: ownerId }]
    }).select('hostId streamKey').lean();
    if (stream && (stream as any).hostId) return String((stream as any).hostId);
    return ownerId;
}`,
  },
  // 2. broadcastRouletteUpdate — resolve + emite também para a sala da stream
  {
    label: 'broadcast resolve + sala da stream',
    old: `async function broadcastRouletteUpdate(ownerId: string) {
    try {
        const items = await findActiveByOwner(ownerId);
        const userDoc = await User.findOne({ id: ownerId }).exec();
        const spinCost = userDoc && Number(userDoc.rouletteSpinCost) > 0 ? Number(userDoc.rouletteSpinCost) : 0;
        const payload = {
            ownerId,
            items: items.map((it: any) => JSON.parse(JSON.stringify(it && it.toObject ? it.toObject() : it))),
            spinCost,
            timestamp: new Date().toISOString(),
        };
        const io = getIO();
        // Envia para a sala da live (espectadores + host)
        io.to(ownerId).emit('roulette_updated', payload);
        // Fallback: também envia para a sala pessoal do host (user_{ownerId})
        io.to(\`user_\${ownerId}\`).emit('roulette_updated', payload);
        console.log(\`[ROULETTE-ROUTES] 📡 Broadcast roulette_updated para sala "\${ownerId}" + user_\${ownerId}: \${items.length} itens, \${spinCost}💎\`);
    } catch (error: any) {
        console.error('[ROULETTE-ROUTES] Erro ao broadcast roulette_updated:', error?.message || error);
    }
}`,
    new: `async function broadcastRouletteUpdate(ownerIdRaw: string) {
    try {
        const ownerId = await resolveOwnerId(ownerIdRaw);
        const items = await findActiveByOwner(ownerId);
        const userDoc = await User.findOne({ id: ownerId }).exec();
        const spinCost = userDoc && Number(userDoc.rouletteSpinCost) > 0 ? Number(userDoc.rouletteSpinCost) : 0;
        const payload = {
            ownerId,
            items: items.map((it: any) => JSON.parse(JSON.stringify(it && it.toObject ? it.toObject() : it))),
            spinCost,
            timestamp: new Date().toISOString(),
        };
        const io = getIO();
        // Salas que recebem: hostId (host), streamKey (espectadores no feed) e
        // a sala pessoal do host (user_{hostId}).
        const rooms = new Set<string>([ownerId]);
        const stream = await Streamer.findOne({ $or: [{ id: ownerId }, { hostId: ownerId }] }).select('streamKey id').lean();
        if (stream) {
            if ((stream as any).streamKey) rooms.add(String((stream as any).streamKey));
            if ((stream as any).id && String((stream as any).id) !== ownerId) rooms.add(String((stream as any).id));
        }
        rooms.forEach((room) => io.to(room).emit('roulette_updated', payload));
        io.to(\`user_\${ownerId}\`).emit('roulette_updated', payload);
        console.log(\`[ROULETTE-ROUTES] 📡 Broadcast roulette_updated (rooms=\${[...rooms].join(',')}): \${items.length} itens, \${spinCost}💎\`);
    } catch (error: any) {
        console.error('[ROULETTE-ROUTES] Erro ao broadcast roulette_updated:', error?.message || error);
    }
}`,
  },
  // 3. sendRouletteStateToClient — resolve
  {
    label: 'sendRouletteStateToClient resolve',
    old: `export async function sendRouletteStateToClient(socket: any, ownerId: string) {
    try {
        const items = await findActiveByOwner(ownerId);
        const userDoc = await User.findOne({ id: ownerId }).exec();`,
    new: `export async function sendRouletteStateToClient(socket: any, ownerIdRaw: string) {
    try {
        const ownerId = await resolveOwnerId(ownerIdRaw);
        const items = await findActiveByOwner(ownerId);
        const userDoc = await User.findOne({ id: ownerId }).exec();`,
  },
  // 4. GET /roulette/items — resolve
  {
    label: 'GET items resolve',
    old: `        const ownerId = (req.query.ownerId as string) || '';
        if (!ownerId) {
            return res.status(400).json({ error: 'ownerId é obrigatório' });
        }
        const items = await findActiveByOwner(ownerId);`,
    new: `        const ownerId = await resolveOwnerId((req.query.ownerId as string) || '');
        if (!ownerId) {
            return res.status(400).json({ error: 'ownerId é obrigatório' });
        }
        const items = await findActiveByOwner(ownerId);`,
  },
  // 5. POST /roulette/items — resolve antes do isHostOwner
  {
    label: 'POST items resolve',
    old: `        const { ownerId, label, icon, color, textColor, type, amount } = req.body || {};
        if (!ownerId || !label || !String(label).trim()) {
            return res.status(400).json({ error: 'ownerId e label são obrigatórios' });
        }
        // 🔒 Só o HOST (dono da roleta) cadastra itens — espectador NUNCA.
        if (!isHostOwner(req, ownerId)) {
            return res.status(403).json({ error: 'Só o host pode cadastrar itens na roleta.' });
        }`,
    new: `        const ownerId = await resolveOwnerId((req.body || {}).ownerId || '');
        const { label, icon, color, textColor, type, amount } = req.body || {};
        if (!ownerId || !label || !String(label).trim()) {
            return res.status(400).json({ error: 'ownerId e label são obrigatórios' });
        }
        // 🔒 Só o HOST (dono da roleta) cadastra itens — espectador NUNCA.
        if (!isHostOwner(req, ownerId)) {
            return res.status(403).json({ error: 'Só o host pode cadastrar itens na roleta.' });
        }`,
  },
  // 6. GET /roulette/cost/:ownerId — resolve
  {
    label: 'GET cost resolve',
    old: `        const { ownerId } = req.params;
        const userDoc = await User.findOne({ id: ownerId }).exec();
        const spinCost = userDoc && Number(userDoc.rouletteSpinCost) > 0 ? Number(userDoc.rouletteSpinCost) : 0;
        res.json({ ownerId, spinCost });`,
    new: `        const { ownerId: ownerIdRaw } = req.params;
        const ownerId = await resolveOwnerId(ownerIdRaw);
        const userDoc = await User.findOne({ id: ownerId }).exec();
        const spinCost = userDoc && Number(userDoc.rouletteSpinCost) > 0 ? Number(userDoc.rouletteSpinCost) : 0;
        res.json({ ownerId, spinCost });`,
  },
  // 7. PUT /roulette/cost — resolve
  {
    label: 'PUT cost resolve',
    old: `        const { ownerId, cost } = req.body || {};
        if (!ownerId) {
            return res.status(400).json({ error: 'ownerId é obrigatório' });
        }
        // 🔒 Só o HOST define o custo — espectador NUNCA.
        if (!isHostOwner(req, ownerId)) {
            return res.status(403).json({ error: 'Só o host pode definir o custo da roleta.' });
        }`,
    new: `        const ownerId = await resolveOwnerId((req.body || {}).ownerId || '');
        const { cost } = req.body || {};
        if (!ownerId) {
            return res.status(400).json({ error: 'ownerId é obrigatório' });
        }
        // 🔒 Só o HOST define o custo — espectador NUNCA.
        if (!isHostOwner(req, ownerId)) {
            return res.status(403).json({ error: 'Só o host pode definir o custo da roleta.' });
        }`,
  },
  // 8. POST /roulette/spin — resolve
  {
    label: 'spin resolve',
    old: `        const { userId, streamId, ownerId } = req.body || {};
        if (!ownerId) {
            return res.status(400).json({ error: 'userId e ownerId são obrigatórios' });
        }`,
    new: `        const { userId, streamId } = req.body || {};
        const ownerId = await resolveOwnerId((req.body || {}).ownerId || '');
        if (!ownerId) {
            return res.status(400).json({ error: 'userId e ownerId são obrigatórios' });
        }`,
  },
];

async function main() {
  const conn = await connect();
  console.log('Conectado em', HOST);
  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));

  let content = await sftpRead(sftp, FILE);
  let changed = false;
  for (const p of PATCHES) {
    if (content.includes(p.old)) {
      content = content.split(p.old).join(p.new);
      changed = true;
      console.log('  ✓', p.label);
    } else if (content.includes(p.new)) {
      console.log('  ⏭ já aplicado:', p.label);
    } else {
      console.error('❌ PADRÃO NÃO ENCONTRADO:', p.label);
      console.error('--- old início ---\n' + p.old.slice(0, 200) + '\n---');
      process.exit(1);
    }
  }
  if (changed) {
    await sftpWrite(sftp, FILE, content);
    console.log('\n✅ rouletteRoutes.ts atualizado!');
  } else {
    console.log('\n⚠️ Nada a aplicar (tudo já aplicado).');
  }
  try { sftp.end(); } catch {}
  try { conn.end(); } catch {}
  process.exit(0);
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });

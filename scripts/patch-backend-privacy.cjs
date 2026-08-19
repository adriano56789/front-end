/**
 * patch-backend-privacy.cjs — Aplica patches de privacidade/convite no backend da VPS.
 * Idempotente: pula patches já aplicados.
 *
 * Uso: node scripts/patch-backend-privacy.cjs
 */
const { Client } = require('ssh2');

const HOST = '2.25.192.154';
const USER = 'root';
const PASSWORD = process.env.VPS_PASS || 'MshrUfZrh09hWr#';

const ROOT = '/app/backend/src';

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

function applyPatch(name, content, patches) {
  let out = content;
  let changed = false;
  for (const p of patches) {
    if (out.includes(p.old)) {
      out = out.split(p.old).join(p.new);
      changed = true;
      console.log(`  ✓ [${name}] patch aplicado: ${p.label}`);
    } else if (out.includes(p.new)) {
      console.log(`  ⏭ [${name}] já aplicado (pulando): ${p.label}`);
    } else {
      console.error(`❌ [${name}] PADRÃO NÃO ENCONTRADO (nem antigo nem novo): ${p.label}`);
      console.error('--- old (início) ---\n' + p.old.slice(0, 150) + '\n---');
      process.exit(1);
    }
  }
  return { out, changed };
}

async function main() {
  const conn = await connect();
  console.log('Conectado em', HOST);
  const sftp = await new Promise((resolve, reject) => conn.sftp((e, s) => e ? reject(e) : resolve(s)));

  // ── 1. LiveCard.ts — campo invitedUsers ──────────────────────────────
  const liveCardPath = ROOT + '/models/LiveCard.ts';
  const liveCard = await sftpRead(sftp, liveCardPath);
  const r1 = applyPatch('LiveCard.ts', liveCard, [
    {
      label: 'interface invitedUsers',
      old: '    isPrivate: boolean;\n    startTime: Date | null;',
      new: '    isPrivate: boolean;\n    invitedUsers: string[];\n    startTime: Date | null;',
    },
    {
      label: 'schema invitedUsers',
      old: "    isPrivate: { type: Boolean, default: false },\n    startTime: { type: Date, default: null },",
      new: "    isPrivate: { type: Boolean, default: false },\n    invitedUsers: { type: [String], default: [] },\n    startTime: { type: Date, default: null },",
    },
  ]);
  if (r1.changed) await sftpWrite(sftp, liveCardPath, r1.out);

  // ── 2. liveRoutes.ts — on_publish espelha isPrivate/invitedUsers ─────
  const liveRoutesPath = ROOT + '/routes/liveRoutes.ts';
  const liveRoutes = await sftpRead(sftp, liveRoutesPath);
  const r2 = applyPatch('liveRoutes.ts', liveRoutes, [
    {
      label: 'on_publish espelha privacidade no LiveCard',
      old: `            await User.findOneAndUpdate({ id: hostId }, { $set: { isLive: true, currentStreamId: hostId } }).catch(() => {});
            await LiveCard.findOneAndUpdate(
                { hostId },
                { $set: { hostId, name: userName, avatar: userAvatar, streamKey, isLive: true, streamStatus: 'active', startTime: new Date(), updatedAt: new Date() } },
                { upsert: true }
            ).catch(() => {});`,
      new: `            await User.findOneAndUpdate({ id: hostId }, { $set: { isLive: true, currentStreamId: hostId } }).catch(() => {});
            // 🔒 Sala privada: espelhar isPrivate + convidados do Streamer no LiveCard —
            // a listagem de salas privadas (categoria private) lê o LiveCard.
            const streamMeta: any = await Streamer.findOne({ hostId }).select('isPrivate invitedUsers').lean().catch(() => null);
            const liveCardSet: any = {
                hostId, name: userName, avatar: userAvatar, streamKey,
                isLive: true, streamStatus: 'active',
                startTime: new Date(), updatedAt: new Date()
            };
            if (streamMeta && typeof streamMeta.isPrivate === 'boolean') {
                liveCardSet.isPrivate = streamMeta.isPrivate;
            }
            if (streamMeta && Array.isArray(streamMeta.invitedUsers)) {
                liveCardSet.invitedUsers = streamMeta.invitedUsers;
            }
            await LiveCard.findOneAndUpdate(
                { hostId },
                { $set: liveCardSet },
                { upsert: true }
            ).catch(() => {});`,
    },
    {
      label: 'categoria private filtra por convidado',
      old: `        } else if (cat === 'private') {
            baseFilter.isPrivate = true;
        } else {`,
      new: `        } else if (cat === 'private') {
            baseFilter.isPrivate = true;
            // 🔒 PRIVACIDADE: quem NÃO foi convidado não vê a sala privada na lista.
            // Só o próprio HOST ou usuários em invitedUsers enxergam a sala.
            if (userId) {
                baseFilter.$or = [
                    { hostId: userId },
                    { invitedUsers: userId }
                ];
            }
        } else {`,
    },
  ]);
  if (r2.changed) await sftpWrite(sftp, liveRoutesPath, r2.out);

  // ── 3. interactionRoutes.ts — convite espelha no LiveCard (+ import) ──
  const interactionPath = ROOT + '/routes/interactionRoutes.ts';
  const interaction = await sftpRead(sftp, interactionPath);
  const r3 = applyPatch('interactionRoutes.ts', interaction, [
    {
      label: 'import LiveCard',
      old: "import { User, Streamer, Gift, GiftTransaction, Followers, UserStatus, Visitor, ChatMessage, Chat, Conversation, Friendship, Invitation, Message, Photo, UserPhoto, ProfilePhoto, UserVideo } from '../models';",
      new: "import { User, Streamer, Gift, GiftTransaction, Followers, UserStatus, Visitor, ChatMessage, Chat, Conversation, Friendship, Invitation, Message, Photo, UserPhoto, ProfilePhoto, UserVideo, LiveCard } from '../models';",
    },
    {
      label: 'convite também grava no LiveCard',
      old: '        // Persistir o convite no stream (controle de acesso para convidados)\n        await Streamer.updateOne(\n            { id: streamId },\n            { $addToSet: { invitedUsers: userId } }\n        );\n        console.log(`💾 [PRIVATE INVITE] Usuário ${userId} adicionado aos convidados do stream ${streamId}`);',
      new: '        // Persistir o convite no stream (controle de acesso para convidados)\n        await Streamer.updateOne(\n            { id: streamId },\n            { $addToSet: { invitedUsers: userId } }\n        );\n        // 🔒 Espelhar o convite no LiveCard — a listagem de salas privadas\n        // (categoria private) filtra por invitedUsers para só convidados verem.\n        await LiveCard.updateOne(\n            { $or: [{ hostId: streamId }, { streamKey: streamId }] },\n            { $addToSet: { invitedUsers: userId } }\n        ).catch(() => {});\n        console.log(`💾 [PRIVATE INVITE] Usuário ${userId} adicionado aos convidados do stream ${streamId}`);',
    },
  ]);
  if (r3.changed) await sftpWrite(sftp, interactionPath, r3.out);

  try { sftp.end(); } catch {}
  try { conn.end(); } catch {}
  console.log('\n✅ Todos os patches aplicados com sucesso!');
  process.exit(0);
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });

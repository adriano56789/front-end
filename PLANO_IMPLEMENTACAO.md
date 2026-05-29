# LiveGo — Plano de Implementação (7 Itens)

Documentação detalhada para implementação sequencial de 7 itens no backend LiveGo.

## Índice

1. [SDP Sanitization — `transport-cc` + `goog-remb`](#1-sdp-sanitization)
2. [Enriquecer `gift_sent` WebSocket](#2-enriquecer-gift_sent-websocket)
3. [Alias `viewer_count_update`](#3-alias-viewer_count_update)
4. [Aliases Guest Events](#4-aliases-guest-events)
5. [PK Score baseado em Gift](#5-pk-score-baseado-em-gift)
6. [PK Timer Automático](#6-pk-timer-automático)
7. [`isMicrophoneMuted` no StreamSession](#7-ismicroponemuted-no-streamsession)

---

## 1. SDP Sanitization — `transport-cc` + `goog-remb`

**Arquivo:** `backend/src/services/srsService.ts:58-61`

Adicionar após a linha 59:

```typescript
if (trimmed.includes('transport-cc')) continue;
if (trimmed.includes('goog-remb')) continue;
```

Remove extensões SDP incompatíveis com SRS que causam falha na negociação WebRTC.

---

## 2. Enriquecer `gift_sent` WebSocket

**Arquivo:** `backend/src/services/ActivityEventService.ts:106-131`

Adicionar `import mongoose from 'mongoose';` no topo.

Dentro do handler `send_gift`, buscar sender e gift antes do emit:

```typescript
let senderName = '';
let senderAvatarFrameId: string | null = null;
let giftAnimationType: string | null = null;

try {
    const [sender, gift] = await Promise.all([
        mongoose.models.User.findOne({ id: userId }).select('name activeFrameId').lean(),
        mongoose.models.Gift.findOne({ id: data.giftId }).select('name videoUrl').lean()
    ]);
    if (sender) {
        senderName = (sender as any).name || '';
        senderAvatarFrameId = (sender as any).activeFrameId || null;
    }
    if (gift) {
        giftAnimationType = (gift as any).videoUrl || null;
    }
} catch (err) {
    console.error('[ActivityEvent] Erro ao buscar dados para gift_sent:', err);
}
```

Adicionar campos ao `gift_sent` e `gift_received` emit: `senderName`, `senderAvatarFrameId`, `giftAnimationType`.

---

## 3. Alias `viewer_count_update`

**Arquivo:** `backend/src/server.ts:488` e `:615`

Após cada `online_users_updated`, emitir também:

```typescript
io.to(streamId).emit('viewer_count_update', {
    streamId,
    count: onlineUsersInStream.length
});
```

---

## 4. Aliases Guest Events

**Arquivo:** `backend/src/routes/callInvitationRoutes.ts`

Após `call_invitation` com `type: 'invitation_sent'` (linha 124):

```typescript
io.to(`user_${hostId}`).emit('guest_invitation_sent', {
    invitationId: invitation._id.toString(), guestId, guestName,
    hostId, roomId: invitation.roomId, streamId: invitation.streamId
});
```

Após `call_invitation` com `type: 'invitation_accepted'` (linha 179):

```typescript
io.to(`user_${invitation.hostId}`).emit('guest_invitation_accepted', {
    invitationId: invitation._id.toString(), guestId: invitation.guestId,
    guestName: invitation.guestName, hostId: invitation.hostId,
    roomId: invitation.roomId, token: invitation.token
});
```

---

## 5. PK Score baseado em Gift

**Arquivo:** `backend/src/routes/giftRoutes.ts`

Adicionar `Battle` ao import. Injetar após `processGiftSend` ~linha 177:

```typescript
if (streamId && streamId !== 'unknown') {
    const activeBattle = await Battle.findOne({
        $or: [{ streamerA: toUser._id }, { streamerB: toUser._id }],
        status: 'active'
    }).lean();
    if (activeBattle) {
        const field = activeBattle.streamerA.toString() === toUser._id.toString() ? 'scoreA' : 'scoreB';
        await Battle.findByIdAndUpdate(activeBattle._id, { $inc: { [field]: totalCost } });
        if (io) {
            const updated = await Battle.findById(activeBattle._id).select('scoreA scoreB').lean();
            io.to(`battle_${activeBattle._id}`).emit('pk_score_update', {
                battleId: activeBattle._id.toString(),
                scoreA: (updated as any)?.scoreA || 0,
                scoreB: (updated as any)?.scoreB || 0
            });
        }
    }
}
```

Score incrementa no valor do gift (`giftPrice * quantity`), não +1 fixo.

---

## 6. PK Timer Automático

**Arquivo:** `backend/src/routes/pkRoutes.ts`

Adicionar no escopo do módulo:

```typescript
const battleTimers = new Map<string, NodeJS.Timeout>();
```

Após criar battle (linha 114):

```typescript
const pkDuration = (durationSeconds || 300) * 1000;
const autoEndTimer = setTimeout(async () => {
    const currentBattle = await Battle.findById(battle._id);
    if (!currentBattle || currentBattle.status !== 'active') return;

    let winnerId: string | null = null;
    if (currentBattle.scoreA > currentBattle.scoreB) {
        const w = await User.findById(currentBattle.streamerA);
        if (w) winnerId = w.id;
    } else if (currentBattle.scoreB > currentBattle.scoreA) {
        const w = await User.findById(currentBattle.streamerB);
        if (w) winnerId = w.id;
    }

    currentBattle.status = 'finished';
    currentBattle.endedAt = new Date();
    if (winnerId) {
        const wu = await User.findOne({ id: winnerId });
        if (wu) currentBattle.winner = wu._id;
    }
    await currentBattle.save();

    const mixer = activeMixers.get(battle._id.toString());
    if (mixer) { stopMixer(mixer); activeMixers.delete(battle._id.toString()); }

    const io = req.app.get('io');
    if (io) {
        [challengerId, opponentId].forEach(uid => {
            io.to(`user_${uid}`).emit('pk_battle_end', {
                battleId: battle._id.toString(), winner: winnerId,
                scoreA: currentBattle.scoreA, scoreB: currentBattle.scoreB,
                endedAt: currentBattle.endedAt, reason: 'timeout'
            });
        });
    }
}, pkDuration);

battleTimers.set(battle._id.toString(), autoEndTimer);
```

No `POST /end/:battleId` (após verificar status), limpar timer:

```typescript
const t = battleTimers.get(battleId);
if (t) { clearTimeout(t); battleTimers.delete(battleId); }
```

---

## 7. `isMicrophoneMuted` no StreamSession

**Arquivo:** `backend/src/models/StreamSession.ts`

| Onde | O que |
|------|-------|
| Interface `IStreamSessionDetail` (linha 33) | `isMicrophoneMuted: boolean;` |
| Interface `IStreamSession` (linha 68) | `isMicrophoneMuted: boolean;` |
| Schema (após linha 90) | `isMicrophoneMuted: { type: Boolean, default: false },` |
| `findDetail` select (linha 200) | Adicionar `isMicrophoneMuted` |
| Projeção `detail` (linhas 220, 349, 481) | Adicionar `isMicrophoneMuted` |
| Índice (opcional) | `StreamSessionSchema.index({ isMicrophoneMuted: 1 });` |

---

## Ordem de Execução Recomendada

```
1 → 7 → 2 → 3 → 4 → 5 → 6
```

| # | Arquivo | Dependências |
|---|---------|-------------|
| 1 | `srsService.ts` | Nenhuma |
| 2 | `ActivityEventService.ts` | Nenhuma |
| 3 | `server.ts` | Nenhuma |
| 4 | `callInvitationRoutes.ts` | Nenhuma |
| 5 | `giftRoutes.ts` | Nenhuma (import Battle já existe no projeto) |
| 6 | `pkRoutes.ts` | Nenhuma (usa `stopMixer` já importado) |
| 7 | `StreamSession.ts` | Nenhuma |

Cada item é independente e pode ser implementado separadamente sem conflito.

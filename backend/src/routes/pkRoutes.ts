/**
 * pkRoutes.ts — PK Battle Routes
 *
 * Endpoints:
 *   POST /start          → Criar batalha PK
 *   POST /end            → Encerrar batalha (APENAS battle, NÃO a live)
 *   POST /finish         → Alias para /end
 *   POST /heart          → Enviar heart (incrementa score)
 *   GET  /config         → Obter configuração de duração
 *   POST /config         → Atualizar configuração de duração
 *   GET  /invites/pending/:userId → Convites pendentes
 *   POST /invites/:inviteId/respond → Responder convite
 *
 * ⚠️ CRÍTICO: /end NÃO encerra a live. Apenas finaliza o Battle.
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ── Structured PK Logger ──────────────────────────────────────────
// Logs formatados para debug em produção.
// Uso: pkLog('START', { battleId, userId, streamId })
const PK_LOG_PREFIX = '⚔️ [PK]';
function pkLog(event: string, data: Record<string, any> = {}) {
  const ts = new Date().toISOString();
  const entry = {
    ts,
    event,
    ...data,
  };
  console.log(`${PK_LOG_PREFIX} ${JSON.stringify(entry)}`);
}

// ── Battle Timers (in-memory) ─────────────────────────────────────
const battleTimers = new Map<string, NodeJS.Timeout>();

// ── PK Config (in-memory) ─────────────────────────────────────────
let pkConfig = { duration: 7 }; // minutos

// ── Helper: obter io do express app ────────────────────────────────
function getIO(req: Request): any {
  return (req as any).app?.get?.('io') || (req as any).app?.locals?.io || null;
}

// ── Helper: obter models ───────────────────────────────────────────
async function getModels() {
  return require('../models/index');
}

// ═══════════════════════════════════════════════════════════════════
// POST /api/pk/start — Criar batalha PK
// ═══════════════════════════════════════════════════════════════════
router.post('/start', async (req: Request, res: Response) => {
  const { userId, streamId, opponentId } = req.body;
  pkLog('START_REQUEST', { userId, streamId, opponentId });
  try {
    if (!userId || !streamId || !opponentId) {
      pkLog('START_FAILED', { reason: 'missing_fields', userId, streamId, opponentId });
      return res.status(400).json({ success: false, error: 'Missing required fields: userId, streamId, opponentId' });
    }

    const { Battle, User } = await getModels();

    // ── Verificar se já existe battle ativa para este host ──
    // Buscar por streamId OU userId (host pode ter battle por qualquer um)
    const existingBattle = await Battle.findOne({
      status: 'active',
      $or: [
        { streamerA: streamId },
        { streamerB: streamId },
        { streamerA: userId },
        { streamerB: userId },
      ],
    });

    if (existingBattle) {
      pkLog('START_DUPLICATE', { reason: 'host_has_active', userId, existingBattleId: existingBattle._id.toString() });
      return res.status(409).json({
        success: false,
        error: 'Host already has an active battle',
        battleId: existingBattle._id.toString(),
      });
    }

    // ── Verificar se oponente já tem battle ativa ──
    // opponentId é o userId do oponente, mas pode estar em streamerA ou streamerB
    const opponentBattle = await Battle.findOne({
      $or: [
        { streamerA: opponentId, status: 'active' },
        { streamerB: opponentId, status: 'active' },
      ],
    });

    if (opponentBattle) {
      pkLog('START_DUPLICATE', { reason: 'opponent_has_active', userId, opponentId });
      return res.status(409).json({
        success: false,
        error: 'Opponent already has an active battle',
      });
    }

    // ── Criar battle ──
    // ⚠️ CORREÇÃO: Ambos os campos devem conter userIds (não streamIds)
    // para que pkScoreService possa buscar battles por userId do receptor.
    // Guardamos streamId separadamente para referência.
    const durationSeconds = (pkConfig.duration || 7) * 60;
    const battle = await Battle.create({
      streamerA: userId,      // userId do host que iniciou (challenger)
      streamerB: opponentId,  // userId do oponente
      streamAId: streamId,    // streamId do host A (para referência)
      scoreA: 0,
      scoreB: 0,
      heartsA: 0,
      heartsB: 0,
      status: 'active',
      startedAt: new Date(),
      durationSeconds,
      roomId: streamId,
      opponentId,
    });

    pkLog('START_OK', { battleId: battle._id.toString(), userId, streamId, opponentId, durationSeconds });

    // ── Timer automático ──
    startBattleTimer(battle._id.toString(), durationSeconds, userId, opponentId, streamId, req);

    // ── Emitir pk_battle_start para ambos os hosts ──
    const io = getIO(req);
    if (io) {
      // Para o challenger (quem iniciou)
      io.to(`user_${userId}`).emit('pk_battle_start', {
        battleId: battle._id.toString(),
        opponentId: opponentId,
        streamId,
        durationSeconds,
        startedAt: new Date(),
      });

      // Para o oponente
      io.to(`user_${opponentId}`).emit('pk_battle_start', {
        battleId: battle._id.toString(),
        opponentId: streamId,
        streamId: opponentId,
        durationSeconds,
        startedAt: new Date(),
      });

      // Para espectadores na sala do host A (stream room)
      io.to(streamId).emit('pk_battle_start', {
        battleId: battle._id.toString(),
        opponentId,
        durationSeconds,
        startedAt: new Date(),
      });
      // NOTA: espectadores da sala do oponente receberão o evento
      // quando o oponente emitir pk_started via socket (se aplicável).
    }

    res.json({
      success: true,
      battleId: battle._id.toString(),
      durationSeconds,
    });
  } catch (error: any) {
    console.error('[PK-START] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/pk/end — Encerrar batalha PK
// POST /api/pk/finish — Alias
//
// ⚠️ ESTA ROTA NÃO ENCERRA A LIVE!
// Apenas finaliza o Battle (status → 'finished') e limpa timers.
// ═══════════════════════════════════════════════════════════════════
async function handleEndPK(req: Request, res: Response) {
  try {
    const { userId, streamId } = req.body;

    if (!streamId) {
      return res.status(400).json({ success: false, error: 'Missing streamId' });
    }

    // Validar formato de IDs (ObjectId do MongoDB tem 24 hex chars)
    const isValidId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidId(streamId) && !isValidId(userId || '')) {
      return res.json({ success: true, alreadyEnded: true });
    }

    const { Battle, User } = await getModels();

    // ── Encontrar battle ativa ──
    // ⚠️ streamerA/B agora contêm userIds, mas buscamos por streamId também
    // para backward compatibility com battles antigas
    const battle = await Battle.findOne({
      status: 'active',
      $or: [
        { streamerA: streamId },
        { streamerB: streamId },
        ...(userId ? [
          { streamerA: userId },
          { streamerB: userId },
        ] : []),
      ],
    });

    if (!battle) {
      return res.json({ success: true, alreadyEnded: true });
    }

    // ── Limpar timer ──
    clearBattleTimer(battle._id.toString());

    // ── Determinar vencedor ──
    let winnerId: string | null = null;
    if (battle.scoreA > battle.scoreB) {
      winnerId = battle.streamerA?.toString();
    } else if (battle.scoreB > battle.scoreA) {
      winnerId = battle.streamerB?.toString();
    }
    // Empate: winnerId fica null

    // ── Atualizar battle ──
    battle.status = 'finished';
    (battle as any).endedAt = new Date();
    if (winnerId) (battle as any).winner = winnerId;
    await battle.save();

    pkLog('END_OK', { battleId: battle._id.toString(), userId, streamId, winner: winnerId || 'tie', scoreA: battle.scoreA, scoreB: battle.scoreB });

    // ── Emitir pk_battle_end para ambos ──
    const io = getIO(req);
    if (io) {
      const payload = {
        battleId: battle._id.toString(),
        winner: winnerId,
        scoreA: battle.scoreA,
        scoreB: battle.scoreB,
        endedAt: new Date(),
        reason: 'manual',
      };

      // Para os hosts (via user_ room)
      const participants = [battle.streamerA?.toString(), battle.streamerB?.toString()].filter(Boolean);
      participants.forEach((uid: string) => {
        io.to(`user_${uid}`).emit('pk_battle_end', payload);
      });

      // Para espectadores (via stream room — usar roomId ou streamAId)
      const spectatorRoom = (battle as any).roomId || (battle as any).streamAId;
      if (spectatorRoom) {
        io.to(spectatorRoom).emit('pk_battle_end', payload);
      }
      io.to(battle.streamerB?.toString() || '').emit('pk_battle_end', {
        battleId: battle._id.toString(),
        winner: winnerId,
        scoreA: battle.scoreA,
        scoreB: battle.scoreB,
        endedAt: new Date(),
        reason: 'manual',
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[PK-END] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

router.post('/end', handleEndPK);
router.post('/finish', handleEndPK);

// ═══════════════════════════════════════════════════════════════════
// POST /api/pk/heart — Enviar heart (incrementa score ATOMICAMENTE)
// ═══════════════════════════════════════════════════════════════════
router.post('/heart', async (req: Request, res: Response) => {
  try {
    const { battleId, team } = req.body;

    if (!battleId || !team) {
      return res.status(400).json({ success: false, error: 'Missing battleId or team' });
    }

    if (team !== 'A' && team !== 'B') {
      return res.status(400).json({ success: false, error: 'Team must be A or B' });
    }

    const { Battle } = await getModels();

    // ── Verificar se battle está ativa ──
    const battle = await Battle.findById(battleId);
    if (!battle || battle.status !== 'active') {
      pkLog('HEART_FAILED', { battleId, team, reason: battle ? 'not_active' : 'not_found' });
      return res.status(404).json({ success: false, error: 'Battle not found or already ended' });
    }

    // ── Incrementar score ATOMICAMENTE ──
    const scoreField = team === 'A' ? 'scoreA' : 'scoreB';
    const updated = await Battle.findOneAndUpdate(
      { _id: battleId, status: 'active' },
      { $inc: { [scoreField]: 1 } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      pkLog('HEART_FAILED', { battleId, team, reason: 'ended_during_update' });
      return res.status(404).json({ success: false, error: 'Battle ended during update' });
    }

    pkLog('HEART_OK', { battleId, team, scoreA: updated.scoreA, scoreB: updated.scoreB });

    const io = getIO(req);
    if (io) {
      const payload = {
        battleId: battleId.toString(),
        scoreA: updated.scoreA || 0,
        scoreB: updated.scoreB || 0,
        team,
      };

      // Para os hosts (streamerA/B são userIds)
      io.to(`user_${updated.streamerA?.toString()}`).emit('pk_score_update', payload);
      io.to(`user_${updated.streamerB?.toString()}`).emit('pk_score_update', payload);

      // Para espectadores (usar stream room)
      const spectatorRoom = (updated as any).roomId || (updated as any).streamAId;
      if (spectatorRoom) {
        io.to(spectatorRoom).emit('pk_score_update', payload);
      }
    }

    res.json({
      success: true,
      scoreA: updated.scoreA || 0,
      scoreB: updated.scoreB || 0,
    });
  } catch (error: any) {
    console.error('[PK-HEART] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/pk/score — Atualizar score (para gift-based scoring)
// ═══════════════════════════════════════════════════════════════════
router.post('/score', async (req: Request, res: Response) => {
  try {
    const { battleId, team, amount } = req.body;

    if (!battleId || !team || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Missing battleId, team, or invalid amount' });
    }

    if (team !== 'A' && team !== 'B') {
      return res.status(400).json({ success: false, error: 'Team must be A or B' });
    }

    const { Battle } = await getModels();

    const scoreField = team === 'A' ? 'scoreA' : 'scoreB';
    pkLog('SCORE_REQUEST', { battleId, team, amount });
    const updated = await Battle.findOneAndUpdate(
      { _id: battleId, status: 'active' },
      { $inc: { [scoreField]: amount } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      pkLog('SCORE_FAILED', { battleId, team, reason: 'not_found_or_ended' });
      return res.status(404).json({ success: false, error: 'Battle not found or already ended' });
    }

    pkLog('SCORE_OK', { battleId, team, amount, scoreA: updated.scoreA, scoreB: updated.scoreB });

    const io = getIO(req);
    if (io) {
      const payload = {
        battleId: battleId.toString(),
        scoreA: updated.scoreA || 0,
        scoreB: updated.scoreB || 0,
        team,
      };

      // Para os hosts (streamerA/B agora são userIds)
      io.to(`user_${updated.streamerA?.toString()}`).emit('pk_score_update', payload);
      io.to(`user_${updated.streamerB?.toString()}`).emit('pk_score_update', payload);

      // Para espectadores (usar roomId/streamAId como stream room)
      const spectatorRoom = (updated as any).roomId || (updated as any).streamAId;
      if (spectatorRoom) {
        io.to(spectatorRoom).emit('pk_score_update', payload);
      }
    }

    res.json({
      success: true,
      scoreA: updated.scoreA || 0,
      scoreB: updated.scoreB || 0,
    });
  } catch (error: any) {
    console.error('[PK-SCORE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/pk/config — Obter configuração
// ═══════════════════════════════════════════════════════════════════
router.get('/config', (_req: Request, res: Response) => {
  res.json({ success: true, config: pkConfig });
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/pk/config — Atualizar configuração
// ═══════════════════════════════════════════════════════════════════
router.post('/config', (req: Request, res: Response) => {
  const { duration } = req.body;
  if (typeof duration === 'number' && duration >= 1 && duration <= 60) {
    pkConfig.duration = duration;
  }
  res.json({ success: true, config: pkConfig });
});

// ═══════════════════════════════════════════════════════════════════
// GET /api/pk/invites/pending/:userId — Convites pendentes
// ═══════════════════════════════════════════════════════════════════
router.get('/invites/pending/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { PKInvite } = await getModels();

    const invites = await PKInvite.find({
      inviteeId: userId,
      status: 'pending',
    }).sort({ createdAt: -1 }).limit(5);

    res.json({ success: true, invites });
  } catch (error: any) {
    console.error('[PK-INVITES] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/pk/invites/:inviteId/respond — Responder convite
// ═══════════════════════════════════════════════════════════════════
router.post('/invites/:inviteId/respond', async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;
    const { status } = req.body;

    if (!status || !['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be accepted or declined' });
    }

    const { PKInvite } = await getModels();

    const invite = await PKInvite.findById(inviteId);
    if (!invite) {
      return res.status(404).json({ success: false, error: 'Invite not found' });
    }

    if (invite.status !== 'pending') {
      return res.status(409).json({ success: false, error: 'Invite already responded' });
    }

    invite.status = status;
    await invite.save();

    // ── Emitir resposta para o convite ──
    const io = getIO(req);
    if (io) {
      io.to(`user_${invite.inviterId}`).emit('pk_invite_response', {
        inviteId: invite._id.toString(),
        status,
        inviteeId: invite.inviteeId,
        streamId: invite.streamId,
      });
    }

    res.json({ success: true, invite });
  } catch (error: any) {
    console.error('[PK-INVITE-RESPOND] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Timer Automático
// ═══════════════════════════════════════════════════════════════════

function startBattleTimer(
  battleId: string,
  durationSeconds: number,
  userIdA: string,       // userId do host A (challenger)
  opponentId: string,    // userId do host B
  streamIdA: string,     // streamId do host A (para espectadores)
  req: Request
) {
  const pkDuration = durationSeconds * 1000;

  const autoEndTimer = setTimeout(async () => {
    try {
      const { Battle, User } = await getModels();
      const currentBattle = await Battle.findById(battleId);
      if (!currentBattle || currentBattle.status !== 'active') return;

      // ── Determinar vencedor ──
      let winnerId: string | null = null;
      if (currentBattle.scoreA > currentBattle.scoreB) {
        winnerId = currentBattle.streamerA?.toString();
      } else if (currentBattle.scoreB > currentBattle.scoreA) {
        winnerId = currentBattle.streamerB?.toString();
      }
      // Empate: winnerId fica null

      // ── Finalizar battle ──
      currentBattle.status = 'finished';
      (currentBattle as any).endedAt = new Date();
      if (winnerId) (currentBattle as any).winner = winnerId;
      await currentBattle.save();

      pkLog('TIMER_END', { battleId, winner: winnerId || 'tie', scoreA: currentBattle.scoreA, scoreB: currentBattle.scoreB });

      // ── Emitir pk_battle_end para ambos os hosts (via userId) ──
      const io = getIO(req);
      if (io) {
        const payload = {
          battleId,
          winner: winnerId,
          scoreA: currentBattle.scoreA,
          scoreB: currentBattle.scoreB,
          endedAt: new Date(),
          reason: 'timeout',
        };

        // Para os hosts (via user_ room)
        io.to(`user_${userIdA}`).emit('pk_battle_end', payload);
        io.to(`user_${opponentId}`).emit('pk_battle_end', payload);

        // Para espectadores (via stream room)
        if (streamIdA) io.to(streamIdA).emit('pk_battle_end', payload);
      }

      // Limpar timer
      battleTimers.delete(battleId);
    } catch (error) {
      console.error(`[PK-TIMER] Error auto-ending battle ${battleId}:`, error);
    }
  }, pkDuration);

  battleTimers.set(battleId, autoEndTimer);
  pkLog('TIMER_START', { battleId, durationSeconds });
}

function clearBattleTimer(battleId: string) {
  const timer = battleTimers.get(battleId);
  if (timer) {
    clearTimeout(timer);
    battleTimers.delete(battleId);
    pkLog('TIMER_CLEAR', { battleId });
  }
}

// ── Cleanup: quando o servidor reinicia, limpar timers órfãos ──
process.on('SIGTERM', () => {
  battleTimers.forEach((timer, battleId) => {
    clearTimeout(timer);
    console.log(`⏰ [PK-TIMER] Cleaned up timer for battle ${battleId}`);
  });
  battleTimers.clear();
});

export default router;

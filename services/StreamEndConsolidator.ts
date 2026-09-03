/**
 * StreamEndConsolidator — Rodada 3a
 *
 * Consolida todas as rotas de encerramento duplicadas em 1 função central.
 *
 * ANTES (rotas espalhadas):
 *   POST /api/streams/:id/end          → encerrar live
 *   POST /api/streams/:id/end-session  → encerrar sessão
 *   POST /api/streams/:id/leave        → espectador sai
 *   POST /api/pk/end                   → encerrar PK
 *   socket leave_stream                → sair da sala
 *   socket disconnect                   → desconexão
 *   on_publish_done (SRS)              → stream morreu
 *   DELETE /api/streams/:id            → deletar live
 *   POST /api/lives/:id/end            → alias duplicado
 *   timeout automático                 → timeout de inatividade
 *
 * DEPOIS (1 central + wrappers):
 *   endStream(streamId, reason, userId?) → função central
 *   As rotas anteriores delegam para esta função
 *
 * USO NO SERVER.TS:
 *   import { StreamEndConsolidator } from './services/StreamEndConsolidator';
 *   const endConsolidator = new StreamEndConsolidator(io, lifecycleManager);
 *
 *   // Em qualquer rota de encerramento:
 *   app.post('/api/streams/:id/end', (req, res) => {
 *     endConsolidator.endStream(req.params.id, 'manual_host', req.body.userId)
 *       .then(result => res.json(result));
 *   });
 */

import { StreamLifecycleManager, StreamStatus } from './StreamLifecycleManager';

// ── Tipos ───────────────────────────────────────────────────────────
export type EndReason =
  | 'manual_host'        // Host clicou "Encerrar Transmissão"
  | 'host_left'          // Host saiu da tela (desconectou)
  | 'on_publish_done'    // SRS notificou stream morta
  | 'pk_end'             // Batalha PK encerrada
  | 'timeout'            // Timeout de inatividade
  | 'admin'              // Admin forçou encerramento
  | 'violation'          // Violação de conteúdo
  | 'reconnect_failed';  // Host não reconectou após timeout

export interface EndStreamResult {
  success: boolean;
  summary?: EndStreamSummary;
  error?: string;
  /** Se a live já estava ended quando a função foi chamada */
  alreadyEnded?: boolean;
}

export interface EndStreamSummary {
  streamId: string;
  hostId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // ms
  peakViewers: number;
  totalGifts: number;
  totalCoins: number;
  newFollowers: number;
  endReason: EndReason;
}

// ── Classe Principal ────────────────────────────────────────────────
export class StreamEndConsolidator {
  private io: any;
  private lifecycle: StreamLifecycleManager;
  /** Locks por streamId para evitar encerramento duplo */
  private endLocks = new Map<string, Promise<any>>();

  constructor(io: any, lifecycle: StreamLifecycleManager) {
    this.io = io;
    this.lifecycle = lifecycle;
  }

  /**
   * FUNÇÃO CENTRAL DE ENCERRAMENTO.
   * Todas as rotas delegam para aqui.
   *
   * @param streamId  - ID da stream
   * @param reason    - Motivo do encerramento
   * @param userId    - ID do usuário que solicitou (opcional)
   * @param extraData - Dados extras (session summary, etc)
   */
  async endStream(
    streamId: string,
    reason: EndReason,
    userId?: string,
    extraData?: any
  ): Promise<EndStreamResult> {
    // Lock serializado por streamId
    while (this.endLocks.has(streamId)) {
      await this.endLocks.get(streamId);
    }

    const lock = this._doEndStream(streamId, reason, userId, extraData);
    this.endLocks.set(streamId, lock);

    try {
      return await lock;
    } finally {
      this.endLocks.delete(streamId);
    }
  }

  private async _doEndStream(
    streamId: string,
    reason: EndReason,
    userId?: string,
    extraData?: any
  ): Promise<EndStreamResult> {
    try {
      const models = await this._getModels();
      const { Streamer, LiveCard, StreamParticipant, StreamSession } = models;

      // 1. Buscar stream
      const stream = await Streamer.findOne({ id: streamId });
      if (!stream) {
        console.warn(`[END-CONSOLIDATOR] Stream ${streamId} não encontrada`);
        return { success: false, error: 'Stream not found' };
      }

      // 2. Se já está ended, retornar sem erro
      if (stream.streamStatus === 'ended') {
        console.log(`[END-CONSOLIDATOR] Stream ${streamId} já está ended, ignorando`);
        return { success: true, alreadyEnded: true };
      }

      // 3. Validar permissão (se userId fornecido)
      if (userId && stream.hostId !== userId && reason === 'manual_host') {
        return { success: false, error: 'Unauthorized: only host can end stream' };
      }

      // 4. Calcular duração
      const startTime = stream.startTime ? new Date(stream.startTime) : new Date();
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 5. Buscar dados de sessão para o summary
      const summaryData = await this._getSessionData(streamId, stream.hostId);

      // 6. Transição de status via LifecycleManager
      const transition = await this.lifecycle.transitionStatus(streamId, 'ended', reason);
      if (!transition.success) {
        // Se a transição falhou (ex: já ended), retry
        if (transition.error?.includes('Invalid transition')) {
          // Forçar ended direto no banco
          await Streamer.findOneAndUpdate(
            { id: streamId },
            { $set: { streamStatus: 'ended', isLive: false, endTime, updatedAt: new Date() } }
          );
        } else {
          return { success: false, error: transition.error };
        }
      }

      // 7. Limpar participantes ativos
      await this._cleanupParticipants(streamId);

      // 8. Atualizar LiveCard
      await LiveCard.findOneAndUpdate(
        { hostId: stream.hostId },
        { $set: { isLive: false, streamStatus: 'ended', viewers: 0, updatedAt: new Date() } }
      );

      // 9. Limpar User.isLive e currentStreamId
      const { User } = models;
      await User.findOneAndUpdate(
        { id: stream.hostId },
        { $set: { isLive: false, currentStreamId: null } }
      );

      // 10. Broadcast de encerramento
      this.io?.to(streamId).emit('stream_ended', {
        streamId,
        hostId: stream.hostId,
        reason,
        timestamp: endTime.toISOString(),
      });

      this.io?.emit('live_removed', {
        streamId,
        hostId: stream.hostId,
        reason,
        timestamp: endTime.toISOString(),
      });

      // 11. Construir summary
      const summary: EndStreamSummary = {
        streamId,
        hostId: stream.hostId,
        startTime,
        endTime,
        duration,
        peakViewers: summaryData.peakViewers,
        totalGifts: summaryData.totalGifts,
        totalCoins: summaryData.totalCoins,
        newFollowers: summaryData.newFollowers,
        endReason: reason,
      };

      console.log(
        `[END-CONSOLIDATOR] Stream ${streamId} encerrada: ${reason}, ` +
        `duração: ${(duration / 1000 / 60).toFixed(1)}min, ` +
        `peak viewers: ${summaryData.peakViewers}`
      );

      return { success: true, summary };
    } catch (error: any) {
      console.error('[END-CONSOLIDATOR] Erro ao encerrar stream:', error);
      return { success: false, error: error.message };
    }
  }

  // ── Thin wrappers para rotas antigas ─────────────────────────────

  /** Wrapper para POST /api/streams/:id/end */
  async handleEndRoute(streamId: string, userId: string): Promise<EndStreamResult> {
    return this.endStream(streamId, 'manual_host', userId);
  }

  /** Wrapper para POST /api/streams/:id/end-session */
  async handleEndSession(streamId: string, sessionData: any): Promise<EndStreamResult> {
    return this.endStream(streamId, 'manual_host', sessionData?.userId, { session: sessionData });
  }

  /** Wrapper para POST /api/streams/:id/leave (espectador sai — NÃO encerra a live) */
  async handleLeave(streamId: string, userId: string): Promise<{ success: boolean }> {
    try {
      const models = await this._getModels();
      const { StreamParticipant } = models;

      // Remover participante
      await StreamParticipant.findOneAndDelete({ streamId, userId });

      // Atualizar contagem
      const count = await StreamParticipant.countDocuments({ streamId });

      // Broadcast atualização de viewers
      this.io?.to(streamId).emit('online_counts_updated', {
        streamId,
        total: count,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('[END-CONSOLIDATOR] Erro no leave:', error);
      return { success: false };
    }
  }

  /** Wrapper para POST /api/pk/end
   * 
   * ⚠️ CORREÇÃO CRÍTICA: NÃO encerrar a live inteira!
   * Apenas finalizar o Battle (status → 'finished') e limpar timers.
   * O encerramento da live é responsabilidade de outra rota.
   */
  async handleEndPK(streamId: string, userId: string): Promise<EndStreamResult> {
    try {
      const models = await this._getModels();
      const { Battle } = models;
      
      // Encontrar battle ativa deste host
      // ⚠️ Buscar por streamId OU userId (streamerA/B agora contêm userIds)
      const battle = await Battle.findOne({
        status: 'active',
        $or: [
          { streamerA: streamId },
          { streamerB: streamId },
          { streamerA: userId },
          { streamerB: userId },
        ],
      });

      if (!battle) {
        return { success: true, alreadyEnded: true };
      }

      // Determinar vencedor
      let winnerId: string | null = null;
      if (battle.scoreA > battle.scoreB) {
        winnerId = battle.streamerA?.toString();
      } else if (battle.scoreB > battle.scoreA) {
        winnerId = battle.streamerB?.toString();
      }

      // Atualizar battle para finished
      battle.status = 'finished';
      (battle as any).endedAt = new Date();
      if (winnerId) (battle as any).winner = winnerId;
      await battle.save();

      // Emitir pk_battle_end para ambos os hosts
      const io = this.io;
      if (io) {
        const participants = [battle.streamerA?.toString(), battle.streamerB?.toString()].filter(Boolean);
        participants.forEach((uid: string) => {
          io.to(`user_${uid}`).emit('pk_battle_end', {
            battleId: battle._id.toString(),
            winner: winnerId,
            scoreA: battle.scoreA,
            scoreB: battle.scoreB,
            endedAt: new Date(),
            reason: 'manual',
          });
        });
      }

      console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'END_CONSOLIDATOR_PK', battleId: battle._id.toString(), winner: winnerId || 'tie', scoreA: battle.scoreA, scoreB: battle.scoreB, userId }));
      return { success: true };
    } catch (error: any) {
      console.error('[END-CONSOLIDATOR] Erro ao finalizar PK:', error);
      return { success: false, error: error.message };
    }
  }

  /** Wrapper para on_publish_done do SRS */
  async handlePublishDone(streamKey: string): Promise<EndStreamResult> {
    try {
      const { Streamer } = await this._getModels();
      const stream = await Streamer.findOne({ streamKey }).lean();
      if (!stream) {
        return { success: false, error: 'Stream not found for streamKey' };
      }
      return this.endStream(stream.id, 'on_publish_done');
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /** Wrapper para timeout de inatividade */
  async handleTimeout(streamId: string): Promise<EndStreamResult> {
    return this.endStream(streamId, 'timeout');
  }

  /** Wrapper para DELETE /api/streams/:id */
  async handleDelete(streamId: string, userId: string): Promise<EndStreamResult> {
    return this.endStream(streamId, 'manual_host', userId);
  }

  // ── Helpers privados ─────────────────────────────────────────────

  private async _getSessionData(streamId: string, hostId: string) {
    try {
      const models = await this._getModels();
      const { StreamParticipant, StreamSession, GiftTransaction } = models;

      // Peak viewers (do StreamSession ou do campo peakViewers)
      let peakViewers = 0;
      try {
        const session = await StreamSession.findOne({ streamId }).lean();
        peakViewers = session?.peakViewers || 0;
      } catch { }

      // Gift stats
      let totalGifts = 0;
      let totalCoins = 0;
      try {
        const gifts = await GiftTransaction.find({ streamId }).lean();
        totalGifts = gifts.length;
        totalCoins = gifts.reduce((sum: number, g: any) => sum + (g.coins || g.amount || 0), 0);
      } catch { }

      // New followers (simplificado)
      let newFollowers = 0;
      try {
        const { Follow } = models;
        const follows = await Follow.find({
          followedId: hostId,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }).lean();
        newFollowers = follows.length;
      } catch { }

      return { peakViewers, totalGifts, totalCoins, newFollowers };
    } catch {
      return { peakViewers: 0, totalGifts: 0, totalCoins: 0, newFollowers: 0 };
    }
  }

  private async _cleanupParticipants(streamId: string): Promise<void> {
    try {
      const models = await this._getModels();
      const { StreamParticipant } = models;

      // Deletar todos os participantes da stream encerrada
      const result = await StreamParticipant.deleteMany({ streamId });
      console.log(`[END-CONSOLIDATOR] ${result.deletedCount} participantes removidos da stream ${streamId}`);
    } catch (err: any) {
      console.warn('[END-CONSOLIDATOR] Erro ao limpar participantes:', err.message);
    }
  }

  private async _getModels(): Promise<any> {
    return (await Promise.resolve().then(() => require('./models/index')));
  }
}

export default StreamEndConsolidator;

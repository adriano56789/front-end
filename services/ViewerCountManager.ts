/**
 * ViewerCountManager — Rodada 3b
 *
 * Unifica 3 fontes de dados de contagem de espectadores:
 *   1. onlineUsers Map (em memória no server) — fonte primária
 *   2. StreamParticipant (MongoDB) — persistência
 *   3. $inc no Streamer.viewers — cache para listagem
 *
 * ANTES:
 *   - onlineUsers.filter() → contagem parcial (pode estar desatualizada)
 *   - StreamParticipant.count() → contagem persistida (pode ter fantasma)
 *   - $set viewers no banco → atualizado com contagem da memória
 *
 * DEPOIS:
 *   - Fonte primária: StreamParticipant (persistida, sobrevive restarts)
 *   - Sincronização periódica: memória → StreamParticipant → $set no Streamer
 *   - Reconciliação: remove participantes órfãos (socket morto mas participant vivo)
 *
 * USO NO SERVER.TS:
 *   import { ViewerCountManager } from './services/ViewerCountManager';
 *   const viewerManager = new ViewerCountManager(io, onlineUsers, socketToUser);
 *
 *   // No join_stream:
 *   await viewerManager.userJoin(streamId, userId, userData);
 *
 *   // No disconnect:
 *   await viewerManager.userLeave(streamId, userId);
 *
 *   // Reconciliação periódica (a cada 30s):
 *   viewerManager.startReconciliation(30000);
 */

// ── Tipos ───────────────────────────────────────────────────────────
export interface ViewerCounts {
  fans: number;
  visitors: number;
  total: number;
}

export interface UserEntry {
  userId: string;
  streamId: string;
  socketIds: Set<string>;
  lastSeen: Date;
  firstConnectionTime: Date;
  /** Tipo de espectador */
  role?: 'fan' | 'visitor' | 'cohost';
}

// ── Classe Principal ────────────────────────────────────────────────
export class ViewerCountManager {
  private io: any;
  private onlineUsers: Map<string, UserEntry>;
  private socketToUser: Map<string, string>;
  private reconciliationTimer: NodeJS.Timeout | null = null;

  constructor(
    io: any,
    onlineUsers: Map<string, UserEntry>,
    socketToUser: Map<string, string>
  ) {
    this.io = io;
    this.onlineUsers = onlineUsers;
    this.socketToUser = socketToUser;
  }

  // ── Join / Leave ─────────────────────────────────────────────────

  /**
   * Registra um usuário entrando na stream.
   * Atualiza memória, StreamParticipant, e emite eventos.
   */
  async userJoin(
    streamId: string,
    userId: string,
    userData?: { name?: string; avatar?: string; role?: string }
  ): Promise<ViewerCounts> {
    try {
      const models = await this._getModels();
      const { StreamParticipant, Streamer, LiveCard, User } = models;

      // 1. Registrar no StreamParticipant
      await StreamParticipant.findOneAndUpdate(
        { streamId, userId },
        {
          $set: {
            streamId,
            userId,
            name: userData?.name || '',
            avatar: userData?.avatar || '',
            role: userData?.role || 'visitor',
            joinedAt: new Date(),
            lastSeen: new Date(),
            isActive: true,
          },
        },
        { upsert: true }
      );

      // 2. Atualizar User.currentStreamId
      await User.findOneAndUpdate(
        { id: userId },
        { $set: { currentStreamId: streamId } }
      ).catch(() => { });

      // 3. Calcular contagens
      const counts = await this._calculateCounts(streamId);

      // 4. Persistir contagem no Streamer e LiveCard
      await this._persistCounts(streamId, counts);

      // 5. Emitir eventos
      this.io?.to(streamId).emit('user:join', {
        userId,
        streamId,
        fans: counts.fans,
        visitors: counts.visitors,
        total: counts.total,
        timestamp: new Date().toISOString(),
      });

      this.io?.to(streamId).emit('online_counts_updated', {
        streamId,
        fans: counts.fans,
        visitors: counts.visitors,
        total: counts.total,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `[VIEWER-MGR] Join: ${userId} → stream ${streamId} ` +
        `(total: ${counts.total}, fans: ${counts.fans}, visitors: ${counts.visitors})`
      );

      return counts;
    } catch (error: any) {
      console.error('[VIEWER-MGR] Erro no userJoin:', error);
      return { fans: 0, visitors: 0, total: 0 };
    }
  }

  /**
   * Registra um usuário saindo da stream.
   * Atualiza memória, StreamParticipant, e emite eventos.
   */
  async userLeave(streamId: string, userId: string): Promise<ViewerCounts | null> {
    try {
      const models = await this._getModels();
      const { StreamParticipant, Streamer, LiveCard, User } = models;

      // 1. Marcar participante como inativo
      await StreamParticipant.findOneAndUpdate(
        { streamId, userId },
        { $set: { isActive: false, leftAt: new Date() } }
      );

      // 2. Atualizar User
      await User.findOneAndUpdate(
        { id: userId },
        { $set: { currentStreamId: null } }
      ).catch(() => { });

      // 3. Calcular contagens
      const counts = await this._calculateCounts(streamId);

      // 4. Persistir
      await this._persistCounts(streamId, counts);

      // 5. Emitir eventos
      this.io?.to(streamId).emit('user:leave', {
        userId,
        streamId,
        fans: counts.fans,
        visitors: counts.visitors,
        total: counts.total,
        timestamp: new Date().toISOString(),
      });

      this.io?.to(streamId).emit('online_counts_updated', {
        streamId,
        fans: counts.fans,
        visitors: counts.visitors,
        total: counts.total,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `[VIEWER-MGR] Leave: ${userId} ← stream ${streamId} ` +
        `(total: ${counts.total}, fans: ${counts.fans}, visitors: ${counts.visitors})`
      );

      return counts;
    } catch (error: any) {
      console.error('[VIEWER-MGR] Erro no userLeave:', error);
      return null;
    }
  }

  // ── Consulta ─────────────────────────────────────────────────────

  /**
   * Retorna as contagens atuais de uma stream.
   * Fonte primária: StreamParticipant (não memória).
   */
  async getCounts(streamId: string): Promise<ViewerCounts> {
    return this._calculateCounts(streamId);
  }

  /**
   * Retorna contagem rápida da memória (sem DB hit).
   * Usar apenas para UI real-time (eventos socket).
   */
  getMemoryCounts(streamId: string): ViewerCounts {
    let fans = 0;
    let visitors = 0;

    for (const entry of this.onlineUsers.values()) {
      if (entry.streamId === streamId) {
        if (entry.role === 'fan' || entry.role === 'cohost') {
          fans++;
        } else {
          visitors++;
        }
      }
    }

    return { fans, visitors, total: fans + visitors };
  }

  // ── Reconciliação periódica ──────────────────────────────────────

  /**
   * Inicia reconciliação periódica.
   * Remove StreamParticipants órfãos (usuário desconectou mas participant ficou).
   * Sincroniza contagem entre memória e banco.
   */
  startReconciliation(intervalMs: number = 30000): void {
    if (this.reconciliationTimer) {
      clearInterval(this.reconciliationTimer);
    }

    this.reconciliationTimer = setInterval(async () => {
      try {
        await this._reconcile();
      } catch (error: any) {
        console.error('[VIEWER-MGR] Erro na reconciliação:', error);
      }
    }, intervalMs);

    console.log(`[VIEWER-MGR] Reconciliação periódica iniciada (${intervalMs}ms)`);
  }

  stopReconciliation(): void {
    if (this.reconciliationTimer) {
      clearInterval(this.reconciliationTimer);
      this.reconciliationTimer = null;
    }
  }

  // ── Helpers privados ─────────────────────────────────────────────

  /**
   * Calcula contagens reais a partir do StreamParticipant (fonte primária).
   */
  private async _calculateCounts(streamId: string): Promise<ViewerCounts> {
    try {
      const models = await this._getModels();
      const { StreamParticipant } = models;

      // Contar participantes ativos no banco
      const activeParticipants = await StreamParticipant.find({
        streamId,
        isActive: true,
      }).lean();

      let fans = 0;
      let visitors = 0;

      for (const p of activeParticipants) {
        if (p.role === 'fan' || p.role === 'cohost') {
          fans++;
        } else {
          visitors++;
        }
      }

      return { fans, visitors, total: fans + visitors };
    } catch (error: any) {
      console.error('[VIEWER-MGR] Erro ao calcular contagens:', error);
      // Fallback para memória
      return this.getMemoryCounts(streamId);
    }
  }

  /**
   * Persiste contagens no Streamer e LiveCard.
   */
  private async _persistCounts(streamId: string, counts: ViewerCounts): Promise<void> {
    try {
      const models = await this._getModels();
      const { Streamer, LiveCard } = models;

      // Atualizar Streamer.viewers
      await Streamer.findOneAndUpdate(
        { id: streamId },
        { $set: { viewers: counts.total, updatedAt: new Date() } }
      );

      // Atualizar LiveCard.viewers
      const stream = await Streamer.findOne({ id: streamId }).select('hostId').lean();
      if (stream?.hostId) {
        await LiveCard.findOneAndUpdate(
          { hostId: stream.hostId },
          { $set: { viewers: counts.total, updatedAt: new Date() } }
        );
      }
    } catch (err: any) {
      console.warn('[VIEWER-MGR] Erro ao persistir contagens:', err.message);
    }
  }

  /**
   * Reconciliação: remove participantes órfãos e sincroniza contagens.
   */
  private async _reconcile(): Promise<void> {
    const models = await this._getModels();
    const { StreamParticipant, Streamer } = models;

    // 1. Buscar streams ativas
    const activeStreams = await Streamer.find({
      isLive: true,
      streamStatus: { $in: ['preparing', 'active'] },
    }).select('id hostId').lean();

    for (const stream of activeStreams) {
      const streamId = stream.id;

      // 2. Buscar participantes ativos
      const participants = await StreamParticipant.find({
        streamId,
        isActive: true,
      }).lean();

      // 3. Para cada participante, verificar se o socket ainda existe
      let orphansRemoved = 0;
      for (const p of participants) {
        const userEntry = this.onlineUsers.get(p.userId);
        if (!userEntry || userEntry.streamId !== streamId) {
          // Participante órfão — socket não existe mais nesta stream
          await StreamParticipant.findOneAndUpdate(
            { streamId, userId: p.userId },
            { $set: { isActive: false, leftAt: new Date() } }
          );
          orphansRemoved++;
        }
      }

      // 4. Recalcular e persistir contagens
      const counts = await this._calculateCounts(streamId);
      await this._persistCounts(streamId, counts);

      if (orphansRemoved > 0) {
        console.log(
          `[VIEWER-MGR] Reconciliação stream ${streamId}: ` +
          `${orphansRemoved} participantes órfãos removidos, ` +
          `contagem corrigida para ${counts.total}`
        );
      }
    }
  }

  private async _getModels(): Promise<any> {
    return (await Promise.resolve().then(() => require('./models/index')));
  }
}

export default ViewerCountManager;

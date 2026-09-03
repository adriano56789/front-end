/**
 * StreamLifecycleManager — Rodada 2a + 2b
 *
 * Rodada 2a: Anti-duplicidade na criação de live ativa (POST /streams + on_publish)
 *   - Garante que um host só tenha 1 live ativa por vez
 *   - on_publish espelha status sem criar duplicata
 *
 * Rodada 2b: Máquina de estados streamStatus unificada
 *   - Estados: preparing → active → ended
 *   - Transições validadas com guards
 *   - Emite eventos socket para sincronizar Streamer/LiveCard/frontend
 *
 * USO NO SERVER.TS:
 *   import { StreamLifecycleManager } from './services/StreamLifecycleManager';
 *   const lifecycle = new StreamLifecycleManager(io);
 *
 *   // No POST /api/streams:
 *   const result = await lifecycle.createStream(hostId, streamData);
 *
 *   // No on_publish do SRS:
 *   await lifecycle.onPublish(streamKey, srsData);
 */

import { EventEmitter } from 'events';

// ── Tipos ───────────────────────────────────────────────────────────
export type StreamStatus = 'preparing' | 'active' | 'ended';

export interface StreamStateTransition {
  from: StreamStatus;
  to: StreamStatus;
  trigger: string;
  timestamp: Date;
}

export interface CreateStreamResult {
  success: boolean;
  stream?: any;
  error?: string;
  /** Se true, a live já existia e foi reutilizada */
  reused?: boolean;
}

// Máquina de estados válida
const VALID_TRANSITIONS: Record<StreamStatus, StreamStatus[]> = {
  preparing: ['active', 'ended'],
  active: ['ended'],
  ended: [], // terminal — não transiciona mais
};

// ── Classe Principal ────────────────────────────────────────────────
export class StreamLifecycleManager extends EventEmitter {
  private io: any;
  /** Locks por hostId para evitar race conditions na criação */
  private creationLocks = new Map<string, Promise<any>>();

  constructor(io: any) {
    super();
    this.io = io;
  }

  // ── Rodada 2a: Anti-duplicidade ──────────────────────────────────

  /**
   * Cria uma nova live para um host.
   * Se já existe live ativa (preparing/active), retorna a existente.
   * Usa lock por hostId para evitar race condition entre POST simultâneos.
   */
  async createStream(hostId: string, streamData: any): Promise<CreateStreamResult> {
    // Lock serializado por hostId
    while (this.creationLocks.has(hostId)) {
      await this.creationLocks.get(hostId);
    }

    const lock = this._doCreateStream(hostId, streamData);
    this.creationLocks.set(hostId, lock);

    try {
      return await lock;
    } finally {
      this.creationLocks.delete(hostId);
    }
  }

  private async _doCreateStream(hostId: string, streamData: any): Promise<CreateStreamResult> {
    try {
      const { Streamer, LiveCard } = await this._getModels();

      // 1. Verificar se já existe live ativa para este host
      const existingStream = await Streamer.findOne({
        hostId,
        streamStatus: { $in: ['preparing', 'active'] },
        isLive: true,
      }).lean();

      if (existingStream) {
        console.log(`[LIFECYCLE] Host ${hostId} já tem live ativa: ${existingStream.id} (status: ${existingStream.streamStatus})`);

        // Espelhar no LiveCard se não existe
        await this._syncLiveCard(hostId, existingStream);

        return {
          success: true,
          stream: existingStream,
          reused: true,
        };
      }

      // 2. Criar nova live com status 'preparing'
      const streamId = streamData.id || `stream_${hostId}_${Date.now()}`;
      const newStream = await Streamer.create({
        id: streamId,
        hostId,
        name: streamData.name || '',
        avatar: streamData.avatar || '',
        title: streamData.title || '',
        streamKey: streamData.streamKey || streamId,
        isLive: true,
        streamStatus: 'preparing',
        startTime: new Date(),
        viewers: 0,
        country: (streamData.country || 'BR').toLowerCase(),
        category: streamData.category || 'popular',
        isPrivate: streamData.isPrivate || false,
        ...streamData,
        streamStatus: 'preparing', // sempre começa como preparing
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`[LIFECYCLE] Nova live criada: ${streamId} para host ${hostId} (status: preparing)`);

      // 3. Criar LiveCard correspondente
      await this._syncLiveCard(hostId, newStream);

      // 4. Emitir evento de nova live
      this.io?.emit('new_live', {
        streamId,
        hostId,
        name: newStream.name,
        avatar: newStream.avatar,
        title: newStream.title,
        streamStatus: 'preparing',
        timestamp: new Date().toISOString(),
      });

      return { success: true, stream: newStream, reused: false };
    } catch (error: any) {
      console.error('[LIFECYCLE] Erro ao criar live:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Chamado pelo callback on_publish do SRS.
   * Transiciona de preparing → active (ou cria live se não existe no banco).
   * NÃO cria duplicata — apenas atualiza status.
   */
  async onPublish(streamKey: string, srsData?: any): Promise<{ success: boolean; stream?: any; error?: string }> {
    try {
      const { Streamer, LiveCard } = await this._getModels();

      // 1. Buscar live existente pelo streamKey
      let stream = await Streamer.findOne({ streamKey }).lean();

      if (!stream) {
        // Fallback: buscar pelo id que pode ser o streamKey
        stream = await Streamer.findOne({ id: streamKey }).lean();
      }

      if (!stream) {
        console.warn(`[LIFECYCLE] on_publish: stream não encontrada para key ${streamKey}`);
        // Criar live mínima para não perder o publish
        return await this._createMinimalStream(streamKey, srsData);
      }

      // 2. Se já está ativa, não fazer nada (anti-duplicidade)
      if (stream.streamStatus === 'active') {
        console.log(`[LIFECYCLE] on_publish: stream ${stream.id} já está ativa, ignorando`);
        return { success: true, stream };
      }

      // 3. Transição válida: preparing → active
      if (stream.streamStatus === 'preparing') {
        return await this.transitionStatus(stream.id, 'active', 'on_publish');
      }

      // 4. Se está ended, algo deu errado — log mas não transiciona
      if (stream.streamStatus === 'ended') {
        console.warn(`[LIFECYCLE] on_publish: stream ${stream.id} já está ended, ignorando publish`);
        return { success: false, error: 'Stream already ended' };
      }

      return { success: true, stream };
    } catch (error: any) {
      console.error('[LIFECYCLE] Erro no on_publish:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transição controlada de status.
   * Valida se a transição é permitida pela máquina de estados.
   */
  async transitionStatus(
    streamId: string,
    newStatus: StreamStatus,
    trigger: string
  ): Promise<{ success: boolean; stream?: any; error?: string }> {
    try {
      const { Streamer, LiveCard } = await this._getModels();

      const stream = await Streamer.findOne({ id: streamId });
      if (!stream) {
        return { success: false, error: 'Stream not found' };
      }

      const currentStatus = stream.streamStatus as StreamStatus;

      // Validar transição
      if (!this.canTransition(currentStatus, newStatus)) {
        console.warn(
          `[LIFECYCLE] Transição inválida: ${currentStatus} → ${newStatus} (trigger: ${trigger})`
        );
        return {
          success: false,
          error: `Invalid transition: ${currentStatus} → ${newStatus}`,
        };
      }

      // Aplicar transição
      const updateData: any = {
        streamStatus: newStatus,
        updatedAt: new Date(),
      };

      // Se ended, marcar isLive = false
      if (newStatus === 'ended') {
        updateData.isLive = false;
        updateData.endTime = new Date();
      }

      // Se active, garantir isLive = true
      if (newStatus === 'active') {
        updateData.isLive = true;
      }

      const updatedStream = await Streamer.findOneAndUpdate(
        { id: streamId },
        { $set: updateData },
        { new: true }
      ).lean();

      // Sincronizar LiveCard
      await this._syncLiveCard(stream.hostId, updatedStream);

      // Log da transição
      const transition: StreamStateTransition = {
        from: currentStatus,
        to: newStatus,
        trigger,
        timestamp: new Date(),
      };
      console.log(
        `[LIFECYCLE] ${streamId}: ${currentStatus} → ${newStatus} (trigger: ${trigger})`
      );

      // Emitir evento socket para todos
      this.io?.to(streamId).emit('stream_status_changed', {
        streamId,
        hostId: stream.hostId,
        from: currentStatus,
        to: newStatus,
        trigger,
        timestamp: transition.timestamp.toISOString(),
      });

      // Broadcast para listing (LiveCard update)
      this.io?.emit('live_updated', {
        streamId,
        hostId: stream.hostId,
        streamStatus: newStatus,
        isLive: newStatus !== 'ended',
        timestamp: transition.timestamp.toISOString(),
      });

      this.emit('statusChanged', transition);

      return { success: true, stream: updatedStream };
    } catch (error: any) {
      console.error('[LIFECYCLE] Erro na transição de status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica se uma transição de status é válida.
   */
  canTransition(from: StreamStatus, to: StreamStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Retorna o status atual da live de um host.
   */
  async getStreamStatus(hostId: string): Promise<StreamStatus | null> {
    try {
      const { Streamer } = await this._getModels();
      const stream = await Streamer.findOne({
        hostId,
        streamStatus: { $in: ['preparing', 'active'] },
      }).lean();
      return stream?.streamStatus as StreamStatus | null;
    } catch {
      return null;
    }
  }

  // ── Helpers privados ─────────────────────────────────────────────

  private async _syncLiveCard(hostId: string, stream: any): Promise<void> {
    try {
      const { LiveCard } = await this._getModels();
      if (!stream) return;

      const cardData = {
        hostId,
        name: stream.name || '',
        avatar: stream.avatar || '',
        title: stream.title || stream.name || '',
        streamKey: stream.streamKey || stream.id,
        playbackUrl: stream.playbackUrl || '',
        hlsUrl: stream.hlsUrl || '',
        country: (stream.country || 'BR').toLowerCase(),
        isLive: stream.isLive || false,
        streamStatus: stream.streamStatus || 'preparing',
        category: stream.category || 'popular',
        isPrivate: stream.isPrivate || false,
        viewers: stream.viewers || 0,
        startTime: stream.startTime || new Date(),
        updatedAt: new Date(),
      };

      await LiveCard.findOneAndUpdate(
        { hostId },
        { $set: cardData },
        { upsert: true }
      );
    } catch (err: any) {
      console.warn('[LIFECYCLE] Erro ao sincronizar LiveCard:', err.message);
    }
  }

  private async _createMinimalStream(streamKey: string, srsData?: any): Promise<CreateStreamResult> {
    try {
      const { Streamer, LiveCard } = await this._getModels();

      const streamId = srsData?.stream_id || `stream_srs_${streamKey}_${Date.now()}`;
      const hostId = srsData?.user_id || streamKey;

      const newStream = await Streamer.create({
        id: streamId,
        hostId,
        streamKey,
        name: srsData?.name || '',
        isLive: true,
        streamStatus: 'active', // publish já aconteceu, direto para active
        startTime: new Date(),
        viewers: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await LiveCard.findOneAndUpdate(
        { hostId },
        {
          $set: {
            hostId,
            streamKey,
            name: srsData?.name || '',
            isLive: true,
            streamStatus: 'active',
            startTime: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      this.io?.emit('new_live', {
        streamId,
        hostId,
        name: srsData?.name || '',
        streamStatus: 'active',
        timestamp: new Date().toISOString(),
      });

      console.log(`[LIFECYCLE] Live mínima criada via on_publish: ${streamId}`);
      return { success: true, stream: newStream, reused: false };
    } catch (error: any) {
      console.error('[LIFECYCLE] Erro ao criar live mínima:', error);
      return { success: false, error: error.message };
    }
  }

  private async _getModels(): Promise<any> {
    return (await Promise.resolve().then(() => require('./models/index')));
  }
}

export default StreamLifecycleManager;

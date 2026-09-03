/**
 * SRSReconciler — Rodada 4
 *
 * Reconcilia o estado do banco (MongoDB) com o estado real do SRS.
 *
 * Problema:
 *   - Streamer.isLive = true no banco, mas stream morta no SRS
 *   - LiveCard mostra live que não existe mais
 *   - Usuários veem cards de lives fantasmas no feed
 *
 * Solução:
 *   - Reconciliação periódica (a cada 60s)
 *   - Para cada stream ativa no banco, verifica se existe no SRS
 *   - Se não existe → encerra via StreamEndConsolidator
 *   - Limpa LiveCards órfãos
 *
 * USO NO SERVER.TS:
 *   import { SRSReconciler } from './services/SRSReconciler';
 *   const reconciler = new SRSReconciler(io, endConsolidator);
 *   reconciler.start(60000); // a cada 60 segundos
 */

import { StreamEndConsolidator } from './StreamEndConsolidator';
import { StreamLifecycleManager } from './StreamLifecycleManager';

// ── Configuração ────────────────────────────────────────────────────
const SRS_API_BASE = process.env.SRS_API_URL || 'http://127.0.0.0:1985';
const SRS_API_SECRET = process.env.SRS_API_SECRET || '';
const SRS_TIMEOUT_MS = 5000;

// ── Tipos ───────────────────────────────────────────────────────────
export interface ReconcileResult {
  timestamp: Date;
  streamsChecked: number;
  streamsAlive: number;
  streamsEnded: number;
  liveCardsCleaned: number;
  errors: string[];
}

interface SRSStreamInfo {
  id: string;
  name: string;
  vhost: string;
  // ... campos do SRS API
}

// ── Classe Principal ────────────────────────────────────────────────
export class SRSReconciler {
  private io: any;
  private endConsolidator: StreamEndConsolidator;
  private lifecycle: StreamLifecycleManager;
  private reconcileTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastResult: ReconcileResult | null = null;

  constructor(
    io: any,
    endConsolidator: StreamEndConsolidator,
    lifecycle: StreamLifecycleManager
  ) {
    this.io = io;
    this.endConsolidator = endConsolidator;
    this.lifecycle = lifecycle;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  /**
   * Inicia reconciliação periódica.
   */
  start(intervalMs: number = 60000): void {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
    }

    // Rodar imediatamente na primeira vez
    this._reconcile().catch(err =>
      console.error('[SRS-RECONCILER] Erro na reconciliação inicial:', err)
    );

    this.reconcileTimer = setInterval(async () => {
      try {
        await this._reconcile();
      } catch (error: any) {
        console.error('[SRS-RECONCILER] Erro na reconciliação periódica:', error);
      }
    }, intervalMs);

    console.log(`[SRS-RECONCILER] Reconciliação periódica iniciada (${intervalMs}ms)`);
  }

  stop(): void {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
  }

  /**
   * Roda uma reconciliação manual (ex: via endpoint de debug).
   */
  async reconcileNow(): Promise<ReconcileResult> {
    return this._reconcile();
  }

  getLastResult(): ReconcileResult | null {
    return this.lastResult;
  }

  // ── Lógica Principal ─────────────────────────────────────────────

  private async _reconcile(): Promise<ReconcileResult> {
    if (this.isRunning) {
      console.log('[SRS-RECONCILER] Reconciliação já em andamento, pulando...');
      return this.lastResult || this._emptyResult();
    }

    this.isRunning = true;
    const result: ReconcileResult = {
      timestamp: new Date(),
      streamsChecked: 0,
      streamsAlive: 0,
      streamsEnded: 0,
      liveCardsCleaned: 0,
      errors: [],
    };

    try {
      const models = await this._getModels();
      const { Streamer, LiveCard } = models;

      // 1. Buscar todas as streams ativas no banco
      const activeStreams = await Streamer.find({
        isLive: true,
        streamStatus: { $in: ['preparing', 'active'] },
      }).lean();

      result.streamsChecked = activeStreams.length;

      if (activeStreams.length === 0) {
        console.log('[SRS-RECONCILER] Nenhuma stream ativa no banco');
        this.lastResult = result;
        return result;
      }

      // 2. Buscar streams ativas no SRS
      const srsStreams = await this._getSRSStreams();
      const srsStreamKeys = new Set(srsStreams.map(s => s.id));

      // 3. Para cada stream no banco, verificar se existe no SRS
      for (const stream of activeStreams) {
        const streamKey = stream.streamKey || stream.id;
        const existsInSRS = srsStreamKeys.has(streamKey);

        if (existsInSRS) {
          result.streamsAlive++;
          continue;
        }

        // Stream morta no SRS — encerrar no banco
        console.log(
          `[SRS-RECONCILER] Stream ${stream.id} (host: ${stream.hostId}) ` +
          `não encontrada no SRS — encerrando`
        );

        try {
          await this.endConsolidator.endStream(stream.id, 'on_publish_done');
          result.streamsEnded++;
        } catch (err: any) {
          result.errors.push(`Erro ao encerrar ${stream.id}: ${err.message}`);
        }
      }

      // 4. Limpar LiveCards órfãos
      result.liveCardsCleaned = await this._cleanOrphanLiveCards(activeStreams);

      // 5. Log do resultado
      console.log(
        `[SRS-RECONCILER] Concluído: ${result.streamsChecked} verificadas, ` +
        `${result.streamsAlive} vivas, ${result.streamsEnded} encerradas, ` +
        `${result.liveCardsCleaned} LiveCards limpos` +
        (result.errors.length > 0 ? ` (${result.errors.length} erros)` : '')
      );

      this.lastResult = result;
      return result;
    } catch (error: any) {
      console.error('[SRS-RECONCILER] Erro geral:', error);
      result.errors.push(error.message);
      this.lastResult = result;
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────

  /**
   * Busca streams ativas no SRS via API HTTP.
   * GET /api/v1/streams
   */
  private async _getSRSStreams(): Promise<SRSStreamInfo[]> {
    try {
      const url = `${SRS_API_BASE}/api/v1/streams`;
      const headers: Record<string, string> = {};
      if (SRS_API_SECRET) {
        headers['Authorization'] = `Bearer ${SRS_API_SECRET}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SRS_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[SRS-RECONCILER] SRS API retornou ${response.status}`);
        return [];
      }

      const data = await response.json();
      // SRS retorna { code: 0, server: ..., streams: [...] }
      return data.streams || [];
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('[SRS-RECONCILER] Timeout ao conectar com SRS');
      } else {
        console.warn('[SRS-RECONCILER] Erro ao buscar streams do SRS:', error.message);
      }
      return [];
    }
  }

  /**
   * Remove LiveCards que referenciam streams encerradas.
   */
  private async _cleanOrphanLiveCards(activeStreams: any[]): Promise<number> {
    try {
      const models = await this._getModels();
      const { LiveCard } = models;

      const activeHostIds = new Set(activeStreams.map(s => s.hostId));

      // Buscar LiveCards com isLive = true
      const liveCards = await LiveCard.find({ isLive: true }).lean();

      let cleaned = 0;
      for (const card of liveCards) {
        if (!activeHostIds.has(card.hostId)) {
          // LiveCard órfão — referência a stream que não está mais ativa no banco
          await LiveCard.findOneAndUpdate(
            { hostId: card.hostId },
            { $set: { isLive: false, streamStatus: 'ended', viewers: 0, updatedAt: new Date() } }
          );
          cleaned++;
        }
      }

      return cleaned;
    } catch (error: any) {
      console.warn('[SRS-RECONCILER] Erro ao limpar LiveCards:', error.message);
      return 0;
    }
  }

  private _emptyResult(): ReconcileResult {
    return {
      timestamp: new Date(),
      streamsChecked: 0,
      streamsAlive: 0,
      streamsEnded: 0,
      liveCardsCleaned: 0,
      errors: [],
    };
  }

  private async _getModels(): Promise<any> {
    return (await Promise.resolve().then(() => require('./models/index')));
  }
}

export default SRSReconciler;

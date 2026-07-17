/**
 * EgressMonitor — Polling de estado do Egress RTMP
 *
 * Faz polling periódico do endpoint /api/livekit/egress/status/:egressId
 * para rastrear a transição:
 *   EGRESS_STARTING → EGRESS_ACTIVE (sucesso)
 *   EGRESS_STARTING → EGRESS_FAILED  (falha)
 *
 * Uso:
 *   const monitor = new EgressMonitor(egressId, {
 *     onActive: () => console.log('Egress ativo!'),
 *     onFailed: (err) => console.error('Egress falhou:', err),
 *   });
 *   monitor.start();
 *   // ...
 *   monitor.stop();
 */

import { api } from './api';

export type EgressStatus =
  | 'EGRESS_STARTING'
  | 'EGRESS_ACTIVE'
  | 'EGRESS_ENDING'
  | 'EGRESS_COMPLETE'
  | 'EGRESS_FAILED'
  | 'EGRESS_LIMIT_REACHED'
  | 'unknown';

export interface EgressMonitorCallbacks {
  /** Chamado quando o Egress atinge EGRESS_ACTIVE */
  onActive?: (data: { egressId: string; startedAt?: number }) => void;
  /** Chamado quando o Egress falha (EGRESS_FAILED) */
  onFailed?: (data: { egressId: string; error?: string }) => void;
  /** Chamado em cada polling com o estado atual */
  onStatusChange?: (status: EgressStatus, prevStatus: EgressStatus) => void;
  /** Chamado quando a consulta deu erro de rede */
  onPollError?: (err: Error) => void;
}

export interface EgressMonitorConfig {
  /** Intervalo entre polls (ms). Default: 3000 */
  pollInterval?: number;
  /** Máximo de polls antes de assumir falha. Default: 30 (90s) */
  maxPolls?: number;
  /** Se true, para automaticamente quando chegar em EGRESS_ACTIVE. Default: true */
  stopOnActive?: boolean;
}

const DEFAULT_CONFIG: Required<EgressMonitorConfig> = {
  pollInterval: 3000,
  maxPolls: 30,
  stopOnActive: true,
};

export class EgressMonitor {
  private egressId: string;
  private callbacks: EgressMonitorCallbacks;
  private config: Required<EgressMonitorConfig>;

  private _timer: ReturnType<typeof setInterval> | null = null;
  private _pollCount = 0;
  private _status: EgressStatus = 'unknown';
  private _destroyed = false;

  get status(): EgressStatus {
    return this._status;
  }

  get isRunning(): boolean {
    return this._timer !== null;
  }

  constructor(
    egressId: string,
    callbacks: EgressMonitorCallbacks = {},
    config?: EgressMonitorConfig,
  ) {
    this.egressId = egressId;
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Inicia o polling */
  start(): void {
    if (this._destroyed) return;
    if (this._timer) {
      console.warn('[EgressMonitor] Já está rodando. Ignorando start().');
      return;
    }

    console.log(
      `[EgressMonitor] Iniciando polling para ${this.egressId} a cada ${this.config.pollInterval}ms`,
    );

    // Poll imediato
    this.poll();

    // Poll periódico
    this._timer = setInterval(() => this.poll(), this.config.pollInterval);
  }

  /** Para o polling */
  stop(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    console.log(`[EgressMonitor] Polling parado para ${this.egressId} (status final: ${this._status})`);
  }

  /** Libera recursos */
  destroy(): void {
    this._destroyed = true;
    this.stop();
    this.callbacks = {};
  }

  private async poll(): Promise<void> {
    if (this._destroyed) return;

    this._pollCount++;

    try {
      const data = await api.getEgressStatus(this.egressId);

      if (!data.success) {
        console.warn(`[EgressMonitor] Poll #${this._pollCount} falhou:`, data.error);
        this.callbacks.onPollError?.(new Error(data.error || 'Erro ao consultar status do Egress'));
        return;
      }

      const newStatus = (data.status || 'unknown') as EgressStatus;
      const prevStatus = this._status;

      if (prevStatus !== newStatus) {
        console.log(
          `[EgressMonitor] #${this._pollCount}: ${prevStatus} → ${newStatus}`,
          data,
        );
        this._status = newStatus;
        this.callbacks.onStatusChange?.(newStatus, prevStatus);
      } else {
        console.log(`[EgressMonitor] #${this._pollCount}: ${newStatus} (sem mudança)`);
      }

      // Callbacks específicos
      if (newStatus === 'EGRESS_ACTIVE' && prevStatus !== 'EGRESS_ACTIVE') {
        console.log('[EgressMonitor] ✅ Egress ativo! RTMP enviando mídia para SRS.');
        this.callbacks.onActive?.({ egressId: this.egressId, startedAt: data.startedAt });
        if (this.config.stopOnActive) {
          this.stop();
        }
      }

      if (newStatus === 'EGRESS_FAILED' && prevStatus !== 'EGRESS_FAILED') {
        const errMsg = data.details?.error || data.error || 'Egress falhou sem detalhes';
        console.error(`[EgressMonitor] ❌ Egress falhou: ${errMsg}`);
        this.callbacks.onFailed?.({ egressId: this.egressId, error: errMsg });
        this.stop();
      }

      if (newStatus === 'EGRESS_COMPLETE' || newStatus === 'EGRESS_LIMIT_REACHED') {
        console.log(`[EgressMonitor] Egress finalizado: ${newStatus}`);
        this.stop();
      }

      // Timeout: excedeu número máximo de polls
      if (this._pollCount >= this.config.maxPolls) {
        console.warn(
          `[EgressMonitor] ⏰ Timeout após ${this._pollCount} polls. ` +
            `Status atual: ${this._status}. Assumindo falha.`,
        );
        this.callbacks.onFailed?.({
          egressId: this.egressId,
          error: `Timeout: Egress não atingiu EGRESS_ACTIVE após ${this._pollCount * this.config.pollInterval}ms`,
        });
        this.stop();
      }
    } catch (err: any) {
      console.error(`[EgressMonitor] Erro no poll #${this._pollCount}:`, err.message);
      this.callbacks.onPollError?.(err);
    }
  }
}

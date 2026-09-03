/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Push Tracking Service — Registra ciclo de vida completo do push.
 *
 * Inspirado no Push Plugin Callback da Tencent (doc 67552):
 *   Stage 1 = enviado (send)
 *   Stage 2 = entregue (delivery)
 *   Stage 3 = clicado (click)
 *
 * Nosso sistema Web Push nativo não tem callback de entrega automático
 * (diferente do APNS/FCM que notificam o backend). Então:
 *   - Stage 1: registramos quando enviamos (já existe via logDelivery)
 *   - Stage 2: o SW regista quando recebeu o push via POST /api/notifications/push-received
 *   - Stage 3: o SW regista quando o usuário clica via POST /api/notifications/push-clicked
 *
 * Além disso:
 *   - Gera PushID único para cada envio
 *   - Retry automático para falhas temporárias (status 500-599)
 *   - Limpeza de tokens expirados via callback
 * ═══════════════════════════════════════════════════════════════════════════
 */

import mongoose from 'mongoose';

// ─── Schema para tracking de pushes ────────────────────────────────────────

const PushLogSchema = new mongoose.Schema({
  pushId:      { type: String, required: true, unique: true, index: true },
  userId:      { type: String, required: true, index: true },
  event:       { type: String, required: true },   // 'gift_received', 'new_message', etc.
  title:       { type: String, default: '' },
  body:        { type: String, default: '' },

  // Ciclo de vida
  sentAt:      { type: Date, default: Date.now },
  deliveredAt: { type: Date, default: null },
  clickedAt:   { type: Date, default: null },

  // Resultado
  status:      { type: String, enum: ['sent', 'delivered', 'clicked', 'failed', 'expired'], default: 'sent' },
  errCode:     { type: Number, default: 0 },     // 0 = sucesso
  errInfo:     { type: String, default: '' },

  // Retry
  retryCount:  { type: Number, default: 0 },
  maxRetries:  { type: Number, default: 2 },
  nextRetryAt: { type: Date, default: null },

  // Metadata
  platform:    { type: String, default: 'web' },
  tokenEndpoint: { type: String, default: '' },  // endpoint do subscription
}, { timestamps: true });

// Index para queries comuns
PushLogSchema.index({ userId: 1, status: 1 });
PushLogSchema.index({ status: 1, nextRetryAt: 1 });  // Para retry
PushLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 }); // TTL 7 dias

let PushLog: any;
try {
  PushLog = mongoose.model('PushLog');
} catch {
  PushLog = mongoose.model('PushLog', PushLogSchema);
}

// ─── Geração de PushID único ───────────────────────────────────────────────

function generatePushId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  const pid = typeof globalThis.process !== 'undefined' ? globalThis.process.pid.toString(36) : '0';
  return `${ts}_${pid}_${rand}`;
}

// ─── API pública ────────────────────────────────────────────────────────────

export class PushTrackingService {

  /**
   * Registra o envio de um push (Stage 1).
   * Retorna o pushId para inclusão no payload.
   */
  static async trackSent(
    userId: string,
    event: string,
    title: string,
    body: string,
    tokenEndpoint: string = '',
  ): Promise<string> {
    const pushId = generatePushId();
    try {
      await PushLog.create({
        pushId,
        userId,
        event,
        title,
        body,
        status: 'sent',
        sentAt: new Date(),
        tokenEndpoint,
      });
    } catch (err: any) {
      console.warn('[PUSH-TRACK] Erro ao registrar envio:', err.message);
    }
    return pushId;
  }

  /**
   * Registra que o push foi entregue ao dispositivo (Stage 2).
   * Chamado pelo frontend quando o SW recebe o push.
   */
  static async trackDelivered(pushId: string): Promise<void> {
    try {
      await PushLog.findOneAndUpdate(
        { pushId, status: 'sent' },
        {
          $set: {
            status: 'delivered',
            deliveredAt: new Date(),
          },
        },
      );
    } catch (err: any) {
      console.warn('[PUSH-TRACK] Erro ao registrar entrega:', err.message);
    }
  }

  /**
   * Registra que o usuário clicou na notificação (Stage 3).
   * Chamado pelo frontend quando o SW detecta notificationclick.
   */
  static async trackClicked(pushId: string): Promise<void> {
    try {
      await PushLog.findOneAndUpdate(
        { pushId },
        {
          $set: {
            status: 'clicked',
            clickedAt: new Date(),
          },
        },
      );
    } catch (err: any) {
      console.warn('[PUSH-TRACK] Erro ao registrar clique:', err.message);
    }
  }

  /**
   * Registra falha no envio.
   */
  static async trackFailed(pushId: string, errCode: number, errInfo: string): Promise<void> {
    try {
      await PushLog.findOneAndUpdate(
        { pushId },
        {
          $set: {
            status: 'failed',
            errCode,
            errInfo,
          },
        },
      );
    } catch (err: any) {
      console.warn('[PUSH-TRACK] Erro ao registrar falha:', err.message);
    }
  }

  /**
   * Marca token como expirado e agenda retry.
   */
  static async trackExpired(pushId: string, tokenEndpoint: string): Promise<void> {
    try {
      await PushLog.findOneAndUpdate(
        { pushId },
        {
          $set: {
            status: 'expired',
            errCode: 404,
            errInfo: 'Subscription expired',
          },
        },
      );

      // Remove o token expirado
      const { DeviceToken } = await import('../models/index');
      await DeviceToken.deleteOne({ endpoint: tokenEndpoint }).catch(() => {});
      console.log(`[PUSH-TRACK] Token expirado removido: ${tokenEndpoint.substring(0, 40)}...`);
    } catch (err: any) {
      console.warn('[PUSH-TRACK] Erro ao processar expiração:', err.message);
    }
  }

  /**
   * Obtém pushes prontos para retry.
   */
  static async getRetryablePushes(limit: number = 10): Promise<any[]> {
    try {
      return await PushLog.find({
        status: 'failed',
        retryCount: { $lt: 2 },
        nextRetryAt: { $lte: new Date() },
      }).limit(limit).lean();
    } catch {
      return [];
    }
  }

  /**
   * Agenda retry para um push.
   */
  static async scheduleRetry(pushId: string): Promise<void> {
    try {
      const push = await PushLog.findOne({ pushId });
      if (!push) return;

      const retryCount = push.retryCount + 1;
      const delayMs = Math.min(30000, 5000 * Math.pow(2, retryCount - 1)); // 5s, 10s, 30s max
      const nextRetryAt = new Date(Date.now() + delayMs);

      await PushLog.findOneAndUpdate(
        { pushId },
        { $set: { retryCount, nextRetryAt } },
      );
    } catch (err: any) {
      console.warn('[PUSH-TRACK] Erro ao agendar retry:', err.message);
    }
  }

  /**
   * Estatísticas de push para monitoramento.
   */
  static async getStats(userId?: string, hours: number = 24): Promise<any> {
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const match: any = { createdAt: { $gte: since } };
    if (userId) match.userId = userId;

    try {
      const stats = await PushLog.aggregate([
        { $match: match },
        { $group: {
          _id: '$status',
          count: { $sum: 1 },
        }},
      ]);

      const result: Record<string, number> = {};
      for (const s of stats) {
        result[s._id] = s.count;
      }
      return { period: `${hours}h`, total: Object.values(result).reduce((a, b) => a + b, 0), ...result };
    } catch {
      return { period: `${hours}h`, total: 0 };
    }
  }
}

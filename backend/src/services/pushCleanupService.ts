/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Push Cleanup Service — Remove tokens expirados e logs antigos.
 *
 * Roda como cron a cada 6 horas via setInterval no server startup,
 * ou pode ser chamado manualmente via POST /api/notifications/push-cleanup.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import mongoose from 'mongoose';

interface CleanupResult {
  expiredTokens: number;
  invalidTokens: number;
  oldPushLogs: number;
  failedPushLogs: number;
  timestamp: string;
}

export class PushCleanupService {

  /**
   * Remove tokens com subscription inválida ou sem endpoint/keys.
   */
  static async cleanInvalidTokens(): Promise<number> {
    try {
      const { DeviceToken } = await import('../models/index');
      const tokens = await DeviceToken.find({}).select('token endpoint').lean();
      let removed = 0;

      for (const t of tokens) {
        let parsed: any;
        try {
          parsed = typeof t.token === 'string' ? JSON.parse(t.token) : t.token;
        } catch {
          // Token não é JSON válido → remover
          await DeviceToken.deleteOne({ _id: t._id });
          removed++;
          continue;
        }

        // Sem endpoint ou sem keys → remover
        if (!parsed?.endpoint || !parsed?.keys?.p256dh || !parsed?.keys?.auth) {
          await DeviceToken.deleteOne({ _id: t._id });
          removed++;
          continue;
        }

        // Token FCM legado (string, não subscription) → remover
        if (typeof t.token === 'string' && !t.token.startsWith('{')) {
          await DeviceToken.deleteOne({ _id: t._id });
          removed++;
          continue;
        }
      }

      if (removed > 0) {
        console.log(`[PUSH-CLEANUP] 🧹 ${removed} tokens inválidos removidos`);
      }
      return removed;
    } catch (err: any) {
      console.warn('[PUSH-CLEANUP] Erro ao limpar tokens inválidos:', err.message);
      return 0;
    }
  }

  /**
   * Remove PushLogs com mais de 7 dias.
   */
  static async cleanOldPushLogs(): Promise<number> {
    try {
      const PushLog = mongoose.model('PushLog');
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      const result = await PushLog.deleteMany({ createdAt: { $lt: sevenDaysAgo } });
      const count = result.deletedCount || 0;
      if (count > 0) {
        console.log(`[PUSH-CLEANUP] 📋 ${count} push logs antigos removidos (>7 dias)`);
      }
      return count;
    } catch {
      // PushLog pode não existir ainda
      return 0;
    }
  }

  /**
   * Remove PushLogs com status 'failed' com mais de 24h (sem retry possível).
   */
  static async cleanStaleFailedLogs(): Promise<number> {
    try {
      const PushLog = mongoose.model('PushLog');
      const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
      const result = await PushLog.deleteMany({
        status: 'failed',
        retryCount: { $gte: 2 },
        createdAt: { $lt: oneDayAgo },
      });
      const count = result.deletedCount || 0;
      if (count > 0) {
        console.log(`[PUSH-CLEANUP] ❌ ${count} push logs falhos antigos removidos`);
      }
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Executa todas as limpezas. Retorna resultado consolidado.
   */
  static async runFullCleanup(): Promise<CleanupResult> {
    const timestamp = new Date().toISOString();
    console.log(`[PUSH-CLEANUP] 🕐 Iniciando limpeza completa: ${timestamp}`);

    const expiredTokens = await this.cleanInvalidTokens();
    const oldPushLogs = await this.cleanOldPushLogs();
    const failedPushLogs = await this.cleanStaleFailedLogs();

    // Contar tokens restantes
    let totalTokens = 0;
    try {
      const { DeviceToken } = await import('../models/index');
      totalTokens = await DeviceToken.countDocuments();
    } catch { /* ignore */ }

    const result: CleanupResult = {
      expiredTokens,
      invalidTokens: 0, // Already counted in expiredTokens
      oldPushLogs,
      failedPushLogs,
      timestamp,
    };

    console.log(`[PUSH-CLEANUP] ✅ Limpeza completa: ${expiredTokens} tokens, ${oldPushLogs + failedPushLogs} logs removidos. Tokens restantes: ${totalTokens}`);
    return result;
  }

  /**
   * Inicia o cron de limpeza a cada 6 horas.
   * Chamar no startup do server.
   */
  static startPeriodicCleanup(intervalMs: number = 6 * 3600 * 1000): void {
    // Primeira limpeza após 1 minuto do startup (não bloquear a inicialização)
    setTimeout(() => {
      this.runFullCleanup().catch(err => {
        console.warn('[PUSH-CLEANUP] Erro na primeira limpeza:', err.message);
      });
    }, 60 * 1000);

    // Limpeza periódica
    setInterval(() => {
      this.runFullCleanup().catch(err => {
        console.warn('[PUSH-CLEANUP] Erro na limpeza periódica:', err.message);
      });
    }, intervalMs);

    console.log(`[PUSH-CLEANUP] ⏰ Cron de limpeza iniciado (a cada ${intervalMs / 3600000}h)`);
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Push Cleanup Routes — Trigger manual cleanup + status.
 *
 * GET  /api/notifications/push-cleanup/status  — Ver status sem limpar
 * POST /api/notifications/push-cleanup/run     — Executar limpeza agora
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import { PushCleanupService } from '../services/pushCleanupService';
import { PushTrackingService } from '../services/pushTrackingService';

const router = express.Router();

/**
 * GET /api/notifications/push-cleanup/status
 * Retorna status da saúde do sistema de push (sem limpar nada).
 */
router.get('/notifications/push-cleanup/status', async (_req, res) => {
  try {
    const { DeviceToken } = await import('../models/index');

    const totalTokens = await DeviceToken.countDocuments();
    const stats24h = await PushTrackingService.getStats(undefined, 24);
    const stats7d = await PushTrackingService.getStats(undefined, 168);

    // Contar tokens potencialmente inválidos
    const allTokens = await DeviceToken.find({}).select('token').lean();
    let invalidCount = 0;
    for (const t of allTokens) {
      try {
        const parsed = typeof t.token === 'string' ? JSON.parse(t.token) : t.token;
        if (!parsed?.endpoint || !parsed?.keys?.p256dh || !parsed?.keys?.auth) {
          invalidCount++;
        }
      } catch {
        invalidCount++;
      }
    }

    res.json({
      success: true,
      status: {
        totalTokens,
        invalidTokens: invalidCount,
        healthyTokens: totalTokens - invalidCount,
        pushStats24h: stats24h,
        pushStats7d: stats7d,
        lastCleanup: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.warn('[PUSH-CLEANUP] Erro ao verificar status:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * POST /api/notifications/push-cleanup/run
 * Executa limpeza manual de tokens expirados e logs antigos.
 */
router.post('/notifications/push-cleanup/run', async (_req, res) => {
  try {
    const result = await PushCleanupService.runFullCleanup();
    res.json({ success: true, result });
  } catch (err: any) {
    console.warn('[PUSH-CLEANUP] Erro na limpeza manual:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;

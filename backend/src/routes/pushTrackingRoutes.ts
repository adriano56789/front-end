/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Push Tracking Routes — Webhook endpoints para tracking de push.
 *
 * Fluxo inspirado no Push Plugin Callback (doc Tencent 67552):
 *
 *   Stage 1 (enviado):  Registrado internamente pelo PushTrackingService
 *   Stage 2 (entregue): POST /api/notifications/push-received  (chamado pelo SW)
 *   Stage 3 (clicado):  POST /api/notifications/push-clicked   (chamado pelo SW)
 *   Estatísticas:       GET  /api/notifications/push-stats     (monitoramento)
 *   Retry:              POST /api/notifications/push-retry     (retry manual)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import { PushTrackingService } from '../services/pushTrackingService';

const router = express.Router();

/**
 * POST /api/notifications/push-received
 * Service Worker chama quando recebe o push (Stage 2 - delivery).
 * Body: { pushId: string }
 */
router.post('/notifications/push-received', async (req, res) => {
  try {
    const { pushId } = req.body;
    if (!pushId) {
      return res.status(400).json({ error: 'pushId is required' });
    }

    await PushTrackingService.trackDelivered(pushId);
    console.log(`[PUSH-TRACK] Stage 2 (delivered): pushId=${pushId}`);
    res.json({ success: true });
  } catch (err: any) {
    console.warn('[PUSH-TRACK] Erro push-received:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * POST /api/notifications/push-clicked
 * Service Worker chama quando usuário clica na notificação (Stage 3).
 * Body: { pushId: string }
 */
router.post('/notifications/push-clicked', async (req, res) => {
  try {
    const { pushId } = req.body;
    if (!pushId) {
      return res.status(400).json({ error: 'pushId is required' });
    }

    await PushTrackingService.trackClicked(pushId);
    console.log(`[PUSH-TRACK] Stage 3 (clicked): pushId=${pushId}`);
    res.json({ success: true });
  } catch (err: any) {
    console.warn('[PUSH-TRACK] Erro push-clicked:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * GET /api/notifications/push-stats
 * Retorna estatísticas de push para monitoramento.
 * Query: ?userId=xxx&hours=24
 */
router.get('/notifications/push-stats', async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const hours = parseInt(req.query.hours as string) || 24;

    const stats = await PushTrackingService.getStats(userId, hours);
    res.json({ success: true, stats });
  } catch (err: any) {
    console.warn('[PUSH-TRACK] Erro push-stats:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * POST /api/notifications/push-retry
 * Retry manual de um push falho.
 * Body: { pushId: string }
 */
router.post('/notifications/push-retry', async (req, res) => {
  try {
    const { pushId } = req.body;
    if (!pushId) {
      return res.status(400).json({ error: 'pushId is required' });
    }

    await PushTrackingService.scheduleRetry(pushId);
    console.log(`[PUSH-TRACK] Retry agendado: pushId=${pushId}`);
    res.json({ success: true });
  } catch (err: any) {
    console.warn('[PUSH-TRACK] Erro push-retry:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * GET /api/notifications/token-health
 * Verifica saúde dos tokens de um usuário.
 * Query: ?userId=xxx
 */
router.get('/notifications/token-health', async (req, res) => {
  try {
    const { DeviceToken } = await import('../models/index');
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const tokens = await DeviceToken.find({ userId }).select('token endpoint platform createdAt').lean();
    const health = tokens.map((t: any) => {
      let parsed: any;
      try {
        parsed = typeof t.token === 'string' ? JSON.parse(t.token) : t.token;
      } catch {
        parsed = null;
      }
      return {
        endpoint: t.endpoint || parsed?.endpoint || 'unknown',
        platform: t.platform || 'unknown',
        hasKeys: !!(parsed?.keys?.p256dh && parsed?.keys?.auth),
        registeredAt: t.createdAt,
        isValid: !!(parsed?.endpoint && parsed?.keys),
      };
    });

    res.json({
      success: true,
      totalTokens: tokens.length,
      validTokens: health.filter(h => h.isValid).length,
      tokens: health,
    });
  } catch (err: any) {
    console.warn('[PUSH-TRACK] Erro token-health:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;

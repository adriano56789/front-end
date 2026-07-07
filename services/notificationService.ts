import { api } from './api';
import { requestFcmToken, getFcmToken } from './firebase';

export async function initNotifications(userId: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('[NOTIFICATION] Notificações não suportadas neste navegador');
    return;
  }

  if (Notification.permission === 'granted') {
    await registerToken(userId);
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then(async (permission) => {
      if (permission === 'granted') {
        await registerToken(userId);
      }
    });
  }
}

async function registerToken(userId: string) {
  try {
    const token = await requestFcmToken();
    if (token) {
      await api.post('/api/notifications/register-token', {
        userId,
        token,
        platform: 'web',
      });
      console.log('[NOTIFICATION] Token registrado no servidor');
    }
  } catch (error) {
    console.error('[NOTIFICATION] Erro ao registrar token:', error);
  }
}

export async function unregisterToken() {
  const token = getFcmToken();
  if (!token) return;

  try {
    await api.delete('/api/notifications/unregister-token', { data: { token } });
    console.log('[NOTIFICATION] Token removido do servidor');
  } catch (error) {
    console.error('[NOTIFICATION] Erro ao remover token:', error);
  }
}

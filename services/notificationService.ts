import { api } from './api';
import { requestFcmToken, getFcmToken } from './firebase';

export type NotifPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

// Lógica única de permissão: granted → registra token; denied → retorna;
// default → pede permissão (deve ser chamado dentro de gesto do usuário no
// celular — Chrome Android / iOS PWA ignoram requestPermission fora de um toque).
async function ensurePermission(userId: string): Promise<NotifPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'denied') {
    // Bloqueada — não repete o pedido; quem chamou mostra o aviso.
    return 'denied';
  }

  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      await registerToken(userId);
    }
    return result as NotifPermissionStatus;
  } catch {
    return Notification.permission as NotifPermissionStatus;
  }
}

/**
 * Inicializa notificações no carregamento do app.
 * Retorna o status real da permissão para o chamador exibir feedback
 * (mensagem de negada / CTA de ativação), algo que antes era silencioso.
 * No desktop o prompt aparece aqui; no celular pode ser ignorado
 * silenciosamente (aí o CTA com gesto do usuário cobre).
 */
export async function initNotifications(userId: string): Promise<NotifPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  // Já ativa: registra o token direto (sem re-pedir permissão).
  if (Notification.permission === 'granted') {
    await registerToken(userId);
    return 'granted';
  }

  return ensurePermission(userId);
}

/**
 * Deve ser chamado DENTRO de um gesto do usuário (toque em botão/toggle):
 * é o caminho correto para navegadores móveis exibirem o prompt.
 */
export async function requestNotificationPermission(userId: string): Promise<NotifPermissionStatus> {
  return ensurePermission(userId);
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

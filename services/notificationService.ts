import { api } from './api';
import { ensurePushSubscription, unsubscribePush, isWebPushSupported, cleanupOldServiceWorkers } from './webPushService';

export type NotifPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

// Lógica única de permissão: granted → registra subscription; denied → retorna;
// default → pede permissão (deve ser chamado dentro de gesto do usuário no
// celular — Chrome Android / iOS PWA ignoram requestPermission fora de um toque).
async function ensurePermission(userId: string): Promise<NotifPermissionStatus> {
  if (!isWebPushSupported()) {
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
  if (!isWebPushSupported()) {
    return 'unsupported';
  }

  // 🧹 SEMPRE limpa SW antigo (firebase-messaging-sw.js) no boot — mesmo
  // sem permissão concedida. Isso garante que o SW novo (/sw.js) assume
  // o controle dos pushes. SEM isso, o SW antigo interceptava o push
  // e só mostrava notificação DENTRO do app (postMessage), nunca fora
  // (showNotification).
  await cleanupOldServiceWorkers();

  // Já ativa: registra a subscription direto (sem re-pedir permissão).
  if (Notification.permission === 'granted') {
    await registerToken(userId);
    console.log('[NOTIFICATION] Permissão já concedida — subscription registrada');
    return 'granted';
  }

  // ⚠️ NÃO pede permissão aqui (sem gesto do usuário = navegador ignora).
  // Retorna o status atual pra quem chamou decidir mostrar o CTA.
  console.log('[NOTIFICATION] Permissão:', Notification.permission, '— aguardando gesto do usuário');
  return Notification.permission as NotifPermissionStatus;
}

/**
 * Deve ser chamado DENTRO de um gesto do usuário (toque em botão/toggle):
 * é o caminho correto para navegadores móveis exibirem o prompt.
 */
export async function requestNotificationPermission(userId: string): Promise<NotifPermissionStatus> {
  return ensurePermission(userId);
}

async function registerToken(_userId: string) {
  try {
    const endpoint = await ensurePushSubscription();
    if (endpoint) {
      console.log('[NOTIFICATION] Subscription Web Push registrada no servidor');
    }
  } catch (error) {
    console.error('[NOTIFICATION] Erro ao registrar subscription:', error);
  }
}

export async function unregisterToken() {
  await unsubscribePush();
}

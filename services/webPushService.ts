import { api } from './api';

// ═══════════════════════════════════════════════════════════════════════════
// Web Push NATIVO — protocolo Web Push + VAPID.
//
// Fluxo: permissão concedida → PushManager.subscribe com a chave VAPID do
// servidor → subscription enviada ao backend → pushes chegam no Service
// Worker (/sw.js, evento 'push').
// ═══════════════════════════════════════════════════════════════════════════

const SW_PATH = '/sw.js';
const ENDPOINT_KEY = 'lg_push_endpoint';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Registra o Service Worker e garante uma subscription ativa.
 * Requer Notification.permission === 'granted' (chamador valida).
 * Retorna o endpoint salvo ou null em caso de indisponibilidade.
 */
/**
 * Remove TODOS os Service Workers antigos (ex: firebase-messaging-sw.js)
 * que interceptavam pushes e NÃO mostravam notificação do sistema.
 * Deve ser chamado no BOOT do app (initNotifications).
 */
export async function cleanupOldServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const allRegs = await navigator.serviceWorker.getRegistrations();
    console.log('[WEB-PUSH] SWs registrados:', allRegs.length);
    for (const reg of allRegs) {
      const swUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
      const isCurrentSW = swUrl.includes('/sw.js');
      console.log('[WEB-PUSH] SW:', swUrl, isCurrentSW ? '(mantido)' : '(REMOVENDO)');
      if (!isCurrentSW) {
        try {
          await reg.unregister();
          console.log('[WEB-PUSH] ✅ SW antigo removido:', swUrl);
        } catch (e) {
          console.warn('[WEB-PUSH] Falha ao remover SW antigo:', e);
        }
      }
    }
  } catch (e) {
    console.warn('[WEB-PUSH] Erro ao limpar SWs antigos:', e);
  }
}

export async function ensurePushSubscription(): Promise<string | null> {
  console.log('[WEB-PUSH] Iniciando ensurePushSubscription...');
  console.log('[WEB-PUSH] Permission:', Notification.permission);
  console.log('[WEB-PUSH] SW supported:', isWebPushSupported());

  if (!isWebPushSupported()) {
    console.warn('[WEB-PUSH] Navegador sem suporte a Web Push');
    return null;
  }

  try {
    await cleanupOldServiceWorkers();

    const registration = await navigator.serviceWorker.register(SW_PATH, { updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
    console.log('[WEB-PUSH] SW registrado e pronto:', registration.scope);

    let sub = await registration.pushManager.getSubscription();
    if (sub) {
      console.log('[WEB-PUSH] Subscription existente encontrada:', sub.endpoint.substring(0, 60));
    } else {
      console.log('[WEB-PUSH] Nenhuma subscription — criando nova...');
      const res = await api.get<{ publicKey?: string }>('/api/notifications/public-key');
      const publicKey = (res as any)?.publicKey || '';
      console.log('[WEB-PUSH] PublicKey do servidor:', publicKey ? publicKey.substring(0, 30) + '...' : 'VAZIA');
      if (!publicKey) {
        console.warn('[WEB-PUSH] Servidor sem chave VAPID configurada');
        return null;
      }
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
      });
      console.log('[WEB-PUSH] Nova subscription criada!');
    }

    const json = sub.toJSON() as { endpoint?: string; keys?: any };
    if (!json.endpoint) {
      console.error('[WEB-PUSH] Subscription sem endpoint!');
      return null;
    }
    console.log('[WEB-PUSH] Endpoint:', json.endpoint.substring(0, 80));
    console.log('[WEB-PUSH] Keys:', json.keys ? 'OK (p256dh + auth)' : 'FALTANDO');

    await api.post('/api/notifications/register-token', {
      subscription: json,
      platform: 'web',
    });
    console.log('[WEB-PUSH] Subscription enviada ao backend com sucesso!');

    try {
      localStorage.setItem(ENDPOINT_KEY, json.endpoint);
    } catch { /* storage opcional */ }

    return json.endpoint;
  } catch (error: any) {
    console.error('[WEB-PUSH] ERRO na subscrição:', error?.name, error?.message || error);
    if (error?.name === 'NotAllowedError') {
      console.error('[WEB-PUSH] Usuário negou permissão de notificação');
    } else if (error?.name === 'InvalidStateError') {
      console.error('[WEB-PUSH] Subscription já existe (InvalidState)');
    }
    return null;
  }
}

/** Remove a subscription local e avisa o servidor. */
export async function unsubscribePush(): Promise<void> {
  try {
    let endpoint: string | null = null;
    try {
      endpoint = localStorage.getItem(ENDPOINT_KEY);
    } catch { /* storage opcional */ }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = registration ? await registration.pushManager.getSubscription() : null;
      if (sub) {
        endpoint = sub.endpoint;
        await sub.unsubscribe();
      }
    }

    if (endpoint) {
      await api.delete('/api/notifications/unregister-token', { endpoint });
    }
    try {
      localStorage.removeItem(ENDPOINT_KEY);
    } catch { /* storage opcional */ }
    console.log('[WEB-PUSH] Subscription removida');
  } catch (error) {
    console.error('[WEB-PUSH] Erro ao remover subscription:', error);
  }
}

/**
 * Escuta pushes que chegaram com o app ABERTO e visível (o SW repassa via
 * postMessage). Callback recebe { title, body, data }.
 */
export function listenForegroundPush(
  handler: (payload: { title: string; body: string; data: Record<string, string> }) => void,
): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }
  const onMessage = (event: MessageEvent) => {
    const msg = event.data as any;
    if (msg?.type === 'PUSH_FOREGROUND' && msg.payload) {
      handler({
        title: msg.payload.title || '',
        body: msg.payload.body || '',
        data: msg.payload.data || {},
      });
    }
  };
  navigator.serviceWorker.addEventListener('message', onMessage);
  return () => navigator.serviceWorker.removeEventListener('message', onMessage);
}

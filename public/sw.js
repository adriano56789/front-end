// Nome do cache para versionamento — incrementar ao atualizar assets
// (v14: deploy roleta host-only + notificações WhatsApp + painel de beleza)
// (v17: status de seguimento na busca + perfil com listas reais)
// (v22: push "X entrou ao vivo" — clique abre /live/ ou /voice-room/)
// (v26: push estilo YouTube — notificação do sistema SEMPRE na tela,
//  mesmo com o app aberto; banner in-app adicional via PUSH_FOREGROUND)
// (v33: deploy Sep/2026 — fix version.json modal update)
const CACHE_NAME = 'livenza-cache-v36';

// Assets do app shell para pré-cache (críticos para o PWA funcionar offline)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

// ── Instalação ─────────────────────────────────────────────────────────────
// Pré-cache dos assets críticos do app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).then(() => {
        console.log('[SW] App shell pré-cacheado com sucesso');
      });
    }).catch((err) => {
      console.warn('[SW] Falha ao pré-cachear alguns assets (provável 404 em ícones de terceiros):', err);
    })
  );
  // Força o SW a ativar imediatamente sem esperar pelo fechamento da página
  self.skipWaiting();
});

// ── Atualização automática ────────────────────────────────────────────────
// O app (App.tsx) envia SKIP_WAITING quando encontra uma versão nova instalada
// no servidor — isso ativa o SW novo imediatamente (sem esperar fechar o app),
// e o controllerchange no app recarrega a página com a versão nova.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Ativando versão nova imediatamente (SKIP_WAITING)');
    self.skipWaiting();
  }
});

// ── Ativação ───────────────────────────────────────────────────────────────
// Limpa caches antigos e assume controle de todas as abas
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando service worker...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker ativo e no controle');
      return self.clients.claim();
    })
  );
});

// ── Interceptação de Fetch ─────────────────────────────────────────────────
// SW configurado APENAS para notificações push. O fetch handler mantém
// Network First básico para PWA (app shell offline), mas NÃO intercepta
// assets de animação — esses ficam no cache HTTP do browser e no
// LottiePreloader (em memória).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/rtc/') ||
      url.pathname.includes('/video/') ||
      url.pathname.includes('/srs/')) {
    return;
  }

  // Network First simples — não bloqueia assets de animação
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') return caches.match('/');
          return new Response('', { status: 408, statusText: 'Sem conexão' });
        });
      })
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Web Push NATIVO (protocolo Web Push + VAPID) — estilo YouTube
//
// O servidor envia JSON: { title, body, tag?, image?, data? { type, ... } }
// - A notificação do SISTEMA aparece SEMPRE (showNotification), com o app
//   ABERTO, em segundo plano ou FECHADO. Nunca suprimimos a notificação.
// - Além disso, se o app estiver aberto e visível, também enviamos o banner
//   in-app via postMessage (PUSH_FOREGROUND) — os dois juntos.
// ═══════════════════════════════════════════════════════════════════════════

async function buildAndShowNotification(raw) {
  const d = raw.data || {};

  // 💬 Mensagem de chat: título = NOME do remetente, corpo = texto da mensagem.
  let notificationTitle = raw.title || 'LiveGo';
  let notificationBody = raw.body || '';
  let notifTag = d.conversationId || raw.tag || d.senderId || d.senderName || 'livego-notif';

  if (d.type === 'new_message') {
    notificationTitle = d.senderName || d.title || 'Nova mensagem';
    notificationBody = d.text || d.message || notificationBody || 'Enviou uma mensagem';
    notifTag = d.conversationId || d.senderId || 'chat';
  } else if (!notificationBody && d.title && d.message) {
    notificationTitle = d.title;
    notificationBody = d.message;
  }

  // 🔔 Ícone SEMPRE o favicon LOCAL. A imagem GRANDE (Big Picture) só na
  // 'live_started' — foto vem do payload OU é buscada na API.
  const notificationOptions = {
    body: notificationBody,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: notifTag, // agrupa/sobrescreve notificações do mesmo chat
    renotify: true, // 🔔 re-alerta a cada mensagem nova (mesmo tag = mesmo chat)
    requireInteraction: true, // 💬 estilo WhatsApp: NÃO some sozinha
    vibrate: [180, 80, 180], // 📳 vibra estilo WhatsApp
    data: d,
  };

  if (d.type === 'new_message') {
    // 📸 Estilo WhatsApp: FOTO de quem mandou como ícone da notificação
    const senderPhoto = d.senderAvatar || d.avatar || d.avatarUrl || '';
    if (senderPhoto) notificationOptions.icon = senderPhoto;
    // 💬 Botão "Responder": abre direto na conversa pronta pra digitar
    notificationOptions.actions = [{ action: 'reply', title: '💬 Responder' }];
  }

  if (d.type === 'live_started') {
    let liveImage = raw.image || d.image || d.avatar || d.avatarUrl || d.streamerAvatar || '';
    if (!liveImage) {
      const streamerId = d.streamerId || d.hostId || d.senderId || '';
      if (streamerId) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 1200);
          try {
            const res = await fetch(`${self.location.origin}/api/users/${encodeURIComponent(streamerId)}/photos/avatar`, { signal: ctrl.signal });
            if (res.ok) {
              const avatarData = await res.json();
              if (avatarData && avatarData.photoUrl) liveImage = avatarData.photoUrl;
            }
          } finally {
            clearTimeout(timer);
          }
        } catch (err) {
          console.warn('[WEB-PUSH SW] Sem foto do streamer para ampliar:', err);
        }
      }
    }
    if (liveImage) {
      notificationOptions.image = liveImage;
    }
  }

  await self.registration.showNotification(notificationTitle, notificationOptions);
}

self.addEventListener('push', async (event) => {
  console.log('[WEB-PUSH SW] ⚡ Push recebido!');
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'LiveGo', body: (event.data && event.data.text()) || '' };
  }
  console.log('[WEB-PUSH SW] Payload:', JSON.stringify(payload).substring(0, 200));

  // 🚫 PUSH REVOCATION: se o backend envia type='push_revoke', cancelar a notificação
  if (payload.data?.type === 'push_revoke') {
    const revokeTag = payload.data.tag || payload.data.conversationId || '';
    if (revokeTag) {
      // Cancelar notificações com o mesmo tag
      const notifications = await self.registration.getNotifications({ tag: revokeTag });
      notifications.forEach(n => n.close());
      console.log('[WEB-PUSH SW] 🚫 Notificações revogadas:', revokeTag);
    }
    return; // Não mostrar notificação de revogação
  }

  event.waitUntil((async () => {
    // ════════════════════════════════════════════════════════════════════
    // 🔔 SEMPRE mostrar a notificação do SISTEMA — igual YouTube.
    // App ABERTO, em segundo plano ou FECHADO: showNotification roda sempre.
    // ════════════════════════════════════════════════════════════════════
    try {
      await buildAndShowNotification(payload);
      console.log('[WEB-PUSH SW] ✅ showNotification chamado com sucesso');

      // 📊 Stage 2 (delivery): reporta ao backend que o push foi recebido
      const pushId = payload.data?.pushId || '';
      if (pushId) {
        try {
          await fetch('/api/notifications/push-received', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pushId }),
          });
        } catch { /* best effort */ }
      }
    } catch (err) {
      // Fallback: se qualquer erro acontecer (fetch de avatar, parsing, etc.),
      // AINDA assim mostra a notificação básica — é melhor algo que nada.
      console.error('[WEB-PUSH SW] Erro em buildAndShowNotification, usando fallback:', err);
      try {
        const d = payload.data || {};
        const title = d.senderName || payload.title || 'LiveGo';
        const body = d.text || d.message || payload.body || 'Nova mensagem';
        await self.registration.showNotification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: d.conversationId || d.senderId || 'livego-fallback',
          renotify: true,
          requireInteraction: true,
          vibrate: [180, 80, 180],
          data: d,
        });
        console.log('[WEB-PUSH SW] ✅ Fallback showNotification OK');
      } catch (fallbackErr) {
        console.error('[WEB-PUSH SW] ❌ Fallback também falhou:', fallbackErr);
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // 📱 App ABERTO e VISÍVEL → TAMBÉM enviar banner in-app (PUSH_FOREGROUND).
    // A notificação do sistema JÁ foi mostrada acima — os dois juntos.
    // ════════════════════════════════════════════════════════════════════
    try {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const visibleClients = clientList.filter((c) => c.visibilityState === 'visible');
      if (visibleClients.length > 0) {
        visibleClients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_FOREGROUND',
            payload: {
              title: payload.title || '',
              body: payload.body || '',
              data: payload.data || {},
            },
          });
        });
        console.log('[WEB-PUSH SW] 📱 App aberto — banner in-app enviado (notificação do sistema também foi mostrada)');
      }
    } catch { /* ignore */ }
  })());
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  const data = notification.data || {};
  const type = data.type;
  const pushId = data.pushId || '';
  console.log('[WEB-PUSH SW] notificationclick:', event.action || 'body', type, data);

  // 📊 Stage 3 (click): reporta ao backend que o usuário clicou
  if (pushId) {
    try {
      fetch('/api/notifications/push-clicked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushId }),
      }).catch(() => {}); // fire and forget
    } catch { /* best effort */ }
  }

  // 💬 Mensagem de chat (clique na notificação OU botão "Responder"):
  // foca o app aberto e manda abrir a conversa certa; se o app estava
  // fechado, abre com deep-link /?openchat=<senderId>.
  if (type === 'new_message' || event.action === 'reply') {
    const senderId = data.senderId || data.from || '';
    const openMsg = {
      type: 'OPEN_CONVERSATION',
      senderId,
      senderName: data.senderName || data.fromUserName || '',
      conversationId: data.conversationId || '',
    };
    event.waitUntil((async () => {
      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        try {
          client.postMessage(openMsg);
          if ('focus' in client) await client.focus();
          return;
        } catch (e) { /* tenta o próximo */ }
      }
      if (clients.openWindow) {
        await clients.openWindow(senderId ? `/?openchat=${encodeURIComponent(senderId)}` : '/');
      }
    })());
    return;
  }

  let urlToOpen = '/';

  if (type === 'call_invitation' || type === 'live_invite') {
    urlToOpen = data.streamId ? `/live/${data.streamId}` : '/';
  } else if (type === 'private_stream_invite') {
    urlToOpen = data.streamId ? `/live/${data.streamId}` : '/';
  } else if (type === 'user_joined_stream') {
    urlToOpen = data.streamId ? `/live/${data.streamId}` : '/';
  } else if (type === 'live_started' || type === 'live_invite_response') {
    const streamId = data.streamKey || data.streamId;
    // 🎙️ Sala de voz → abre a sala; transmissão de vídeo → abre a live
    if (streamId && streamId.startsWith('voice_')) {
      urlToOpen = `/voice-room/${streamId}`;
    } else {
      urlToOpen = streamId ? `/live/${streamId}` : '/';
    }
  } else if (type === 'gift_received') {
    // 🎁 Presente: abrir a live onde o presente foi enviado
    const streamId = data.streamId || '';
    urlToOpen = streamId ? `/live/${streamId}` : '/';
  } else if (type === 'new_follower') {
    // 👤 Novo seguidor: abrir o perfil de quem seguiu
    const followerId = data.followerId || '';
    urlToOpen = followerId ? `/profile/${followerId}` : '/';
  } else if (type === 'friend_invite_received') {
    // 👥 Convite de amizade: abrir a página de amigos/solicitações
    urlToOpen = '/?section=friends';
  } else if (type === 'photo_liked') {
    // 📸 Like na foto: abrir a foto
    const photoId = data.photoId || '';
    urlToOpen = photoId ? `/photo/${photoId}` : '/';
  } else if (type === 'stream_liked') {
    // 👍 Like na live: abrir a live
    const streamId = data.streamId || '';
    urlToOpen = streamId ? `/live/${streamId}` : '/';
  } else if (type === 'comment_received') {
    // 💬 Comentário: abrir o conteúdo comentado
    const targetId = data.targetId || '';
    const targetType = data.targetType || '';
    if (targetType === 'photo') urlToOpen = targetId ? `/photo/${targetId}` : '/';
    else if (targetType === 'video') urlToOpen = targetId ? `/video/${targetId}` : '/';
    else urlToOpen = '/';
  } else if (type === 'video_liked') {
    // 🎬 Like no vídeo: abrir o vídeo
    const videoId = data.videoId || '';
    urlToOpen = videoId ? `/video/${videoId}` : '/';
  } else {
    urlToOpen = '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Nome do cache para versionamento — incrementar ao atualizar assets
const CACHE_NAME = 'livenza-cache-v1';

// Assets do app shell para pré-cache (críticos para o PWA funcionar offline)
const PRECACHE_URLS = [
  '/',
  '/site.webmanifest',
  '/favicon.svg',
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
// Estratégia: Network First, Cache Fallback
// Prioriza conteúdo fresco da rede, mas usa cache como fallback para offline
self.addEventListener('fetch', (event) => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') return;

  // Ignorar requisições de API e streaming (não devem ser cacheadas)
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/rtc/') ||
      url.pathname.includes('/video/') ||
      url.pathname.includes('.m3u8') ||
      url.pathname.includes('.ts') ||
      url.pathname.includes('.flv')) {
    return;
  }

  // Estratégia: tentar rede primeiro, cair no cache em caso de falha
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Verificar se a resposta é válida
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Clonar a resposta para poder armazenar no cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Falha na rede — tentar servir do cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se não tem no cache nem na rede, retorna um fallback para a página inicial
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('', { status: 408, statusText: 'Sem conexão' });
        });
      })
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Firebase Cloud Messaging (FCM) — Notificações Push
// ═══════════════════════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDU8JgZnLW1o_B7q2fmG1IoYrXSAybNFRo',
  authDomain: 'livego-54bb7.firebaseapp.com',
  projectId: 'livego-54bb7',
  storageBucket: 'livego-54bb7.firebasestorage.app',
  messagingSenderId: '359465743060',
  appId: '1:359465743060:web:e53ff179a5e9ee42164141',
  measurementId: 'G-610W32XQJC',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[FCM-SW] Mensagem em background:', payload);

  const notificationTitle = payload.notification?.title || 'LiveGo';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  const data = notification.data || {};
  const type = data.type;

  let urlToOpen = '/';

  if (type === 'call_invitation' || type === 'live_invite') {
    urlToOpen = data.streamId ? `/stream/${data.streamId}` : '/';
  } else if (type === 'private_stream_invite') {
    urlToOpen = data.streamId ? `/stream/${data.streamId}` : '/';
  } else if (type === 'user_joined_stream') {
    urlToOpen = data.streamId ? `/stream/${data.streamId}` : '/';
  } else if (type === 'live_started' || type === 'live_invite_response') {
    const streamId = data.streamKey || data.streamId;
    urlToOpen = streamId ? `/stream/${streamId}` : '/';
  } else if (type === 'new_message') {
    urlToOpen = data.conversationId ? `/chat/${data.conversationId}` : '/messages';
  } else {
    urlToOpen = data.url || data.streamId ? `/${data.streamId || data.streamKey || ''}` : '/';
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

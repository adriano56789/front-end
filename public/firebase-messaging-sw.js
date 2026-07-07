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

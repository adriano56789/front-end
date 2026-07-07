import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyDU8JgZnLW1o_B7q2fmG1IoYrXSAybNFRo',
  authDomain: 'livego-54bb7.firebaseapp.com',
  projectId: 'livego-54bb7',
  storageBucket: 'livego-54bb7.firebasestorage.app',
  messagingSenderId: '359465743060',
  appId: '1:359465743060:web:e53ff179a5e9ee42164141',
  measurementId: 'G-610W32XQJC',
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let fcmToken: string | null = null;

export function initFirebaseApp() {
  if (app) return app;
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
}

export function initMessaging() {
  if (messaging) return messaging;
  const fbApp = initFirebaseApp();
  if (!fbApp) return null;
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(fbApp);
  }
  return messaging;
}

export async function requestFcmToken(): Promise<string | null> {
  const msg = initMessaging();
  if (!msg) {
    console.warn('[FCM] Messaging não disponível (sem service worker)');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Permissão de notificação negada');
      return null;
    }

    const currentToken = await getToken(msg);

    if (currentToken) {
      fcmToken = currentToken;
      console.log('[FCM] Token obtido:', currentToken.substring(0, 20) + '...');
      return currentToken;
    } else {
      console.warn('[FCM] Não foi possível obter o token');
      return null;
    }
  } catch (error) {
    console.error('[FCM] Erro ao obter token:', error);
    return null;
  }
}

export function getFcmToken() {
  return fcmToken;
}

export function onForegroundMessage(callback: (payload: any) => void) {
  const msg = initMessaging();
  if (!msg) return () => {};

  const unsubscribe = onMessage(msg, (payload) => {
    console.log('[FCM] Mensagem recebida em foreground:', payload);
    callback(payload);
  });

  return unsubscribe;
}

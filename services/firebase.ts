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
  // 🔑 VAPID key do projeto (Firebase Console → Configurações do projeto →
  // Cloud Messaging → Certificados de Web Push). OBRIGATÓRIA para web push:
  // sem ela o getToken() gera um token que o FCM rejeita.
  vapidKey: 'BJamjvLU2QconKZHYCXSuhkd8lvSIP0vfe4Psuxp_IywVMdQ_cT1JJGtfmRFpovU_iKqLN9kPBr01g5sUKoDzoY',
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

    // 🔑 VAPID key obrigatória no getToken para web push (sem ela o FCM
    // rejeita o token com "not a valid FCM registration token").
    const currentToken = firebaseConfig.vapidKey
      ? await getToken(msg, { vapidKey: firebaseConfig.vapidKey })
      : await getToken(msg);

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

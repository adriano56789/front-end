import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'livego_pwa_install_dismissed';

/**
 * Detecta se o dispositivo é mobile pelo user agent
 */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(ua);
}

/**
 * Detecta se o PWA já está instalado no dispositivo
 */
function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS PWA salvo na tela inicial
  if ((window.navigator as any).standalone === true) return true;
  // Android / Chrome PWA (display-mode: standalone ou minimal-ui)
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
  // WebView / wrapper nativo
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('webview') || ua.includes('wv')) return true;
  return false;
}

/**
 * Verifica se o usuário já dispensou o banner anteriormente
 */
function isDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {}
}

function clearDismissed() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

interface PWAInstallState {
  /** Se o navegador suporta instalação PWA (beforeinstallprompt foi capturado) */
  isInstallable: boolean;
  /** Se o dispositivo é mobile */
  isMobile: boolean;
  /** Se o PWA já está instalado */
  isInstalled: boolean;
  /** Se deve mostrar o banner (installable + mobile + não instalado + não dispensado) */
  showBanner: boolean;
  /** Dispara o prompt de instalação nativo do navegador */
  promptInstall: () => Promise<boolean>;
  /** Descarta o banner permanentemente */
  dismissBanner: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isPWAInstalled());
  const [dismissed, setDismissed] = useState(isDismissed());

  const mobile = isMobileDevice();
  // Mostra o banner SOMENTE se beforeinstallprompt foi capturado + mobile + não instalado + não dispensado
  // = comportamento nativo do Chrome: o modal só aparece quando o navegador considera o app instalável
  const showBanner = isInstallable && mobile && !isInstalled && !dismissed;

  useEffect(() => {
    // Capturar o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('[PWA] beforeinstallprompt capturado — app instalável');
    };

    // Detectar quando o app foi instalado
    const handleAppInstalled = () => {
      console.log('[PWA] Aplicativo instalado com sucesso!');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
      clearDismissed(); // limpar flag de dismiss se existir
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Verificar se já está instalado (pode mudar durante a sessão)
    const checkInstalled = () => {
      if (isPWAInstalled()) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };
    checkInstalled();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA] Nenhum deferredPrompt disponível');
      return false;
    }

    try {
      // Mostrar o prompt nativo do navegador
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      console.log('[PWA] Resultado do prompt:', result.outcome);
      
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      } else {
        // Usuário recusou — não marcar como dismissed para poder tentar de novo
        return false;
      }
    } catch (err) {
      console.error('[PWA] Erro ao mostrar prompt:', err);
      return false;
    } finally {
      // O deferredPrompt só pode ser usado uma vez
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setDismissed(true);
    markDismissed();
  }, []);

  return {
    isInstallable,
    isMobile: mobile,
    isInstalled,
    showBanner,
    promptInstall,
    dismissBanner,
  };
}

import { env } from '../src/config/environment';

const trimSlash = (value: string) => value.replace(/\/+$/, '');

const SRS_HOST = env.srs.host;
const SRS_HTTP_PORT = env.srs.httpPort; // 8080

/** Base da API — nunca usar localhost em produção (VITE_API_BASE_URL em .env.prod). */
export const getApiBaseUrl = (): string => trimSlash(env.apiBaseUrl);

/**
 * 🔥 CORREÇÃO CRÍTICA: Base URL para HLS/FLV
 * Usar o HOST do SRS e a porta 8080 DIRETAMENTE.
 * Isso evita passar pelo proxy do Vite (5173) ou Backend (3000) que estavam causando 404.
 */
export const getVideoHttpBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_SRS_HTTP_URL as string | undefined;
  if (fromEnv) return trimSlash(fromEnv);
  if (import.meta.env.PROD) return '/srs';
  return `http://${SRS_HOST}:${SRS_HTTP_PORT}`;
};

/** SRS HLS Playback URL */
export const getHlsPlayUrl = (streamId: string): string => {
  return `${getVideoHttpBaseUrl()}/live/${streamId}.m3u8`;
};

/** SRS FLV Playback URL */
export const getFlvPlayUrl = (streamId: string): string => {
  return `${getVideoHttpBaseUrl()}/live/${streamId}.flv`;
};

export const isNativeRtmpBridge = (): boolean =>
  typeof window !== 'undefined' &&
  'Android' in window &&
  typeof (window as Window & { Android?: { startRTMP?: (k: string) => void } }).Android?.startRTMP === 'function';

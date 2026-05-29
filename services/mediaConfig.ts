import { env } from '../src/config/environment';

const trimSlash = (value: string) => value.replace(/\/+$/, '');

const SRS_HOST = env.srs.host;
const SRS_HTTP_PORT = env.srs.httpPort; // 8080
const SRS_RTMP_PORT = env.srs.rtmpPort;
const SRS_RTC_PORT = env.srs.rtcPort;
const SRS_API_PORT = env.srs.apiPort; // 1985

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

/** SRS HLS Playback URL (Native port 8080) */
export const getHlsPlayUrl = (streamId: string): string => {
  const normalizedId = streamId.startsWith('stream_') ? streamId : `stream_${streamId}`;
  return `${getVideoHttpBaseUrl()}/live/${normalizedId}.m3u8`;
};

/** SRS FLV Playback URL (Native port 8080) */
export const getFlvPlayUrl = (streamId: string): string => {
  const normalizedId = streamId.startsWith('stream_') ? streamId : `stream_${streamId}`;
  return `${getVideoHttpBaseUrl()}/live/${normalizedId}.flv`;
};

/** RTMP publish (SRS) */
export const getRtmpPublishUrl = (streamKey: string): string => {
  const normalizedKey = streamKey.startsWith('stream_') ? streamKey : `stream_${streamKey}`;
  const base =
    (import.meta.env.VITE_SRS_RTMP_URL as string | undefined) ||
    `rtmp://${SRS_HOST}:${SRS_RTMP_PORT}/live`;
  return `${trimSlash(base)}/${normalizedKey}`;
};

/** SRT publish URL */
export const getSrtPublishUrl = (streamKey: string): string => {
  const normalizedKey = streamKey.startsWith('stream_') ? streamKey : `stream_${streamKey}`;
  const base =
    (import.meta.env.VITE_SRS_SRT_URL as string | undefined) ||
    `srt://${SRS_HOST}:9999`;
  return `${trimSlash(base)}?streamid=${encodeURIComponent(normalizedKey)}`;
};

/** WebRTC publish URL (webrtc://) */
export const getWebrtcPublishUrl = (streamKey: string): string => {
  const normalizedKey = streamKey.startsWith('stream_') ? streamKey : `stream_${streamKey}`;
  const base =
    (import.meta.env.VITE_SRS_WEBRTC_URL as string | undefined) ||
    `webrtc://${SRS_HOST}:${SRS_RTC_PORT}/live`;
  return `${trimSlash(base)}/${normalizedKey}`;
};

export const isNativeRtmpBridge = (): boolean =>
  typeof window !== 'undefined' &&
  'Android' in window &&
  typeof (window as Window & { Android?: { startRTMP?: (k: string) => void } }).Android?.startRTMP === 'function';

/** WHIP endpoint — via nginx proxy em producao, direto em dev */
export const getWhipEndpointUrl = (streamKey: string): string => {
  const normalizedKey = streamKey.startsWith('stream_') ? streamKey : `stream_${streamKey}`;
  const fromEnv = import.meta.env.VITE_SRS_WHIP_URL as string | undefined;
  if (fromEnv) return `${trimSlash(fromEnv)}/?app=live&stream=${encodeURIComponent(normalizedKey)}`;
  if (import.meta.env.PROD) return `/rtc/v1/whip/?app=live&stream=${encodeURIComponent(normalizedKey)}`;
  return `http://${SRS_HOST}:${SRS_API_PORT}/rtc/v1/whip/?app=live&stream=${encodeURIComponent(normalizedKey)}`;
};

/** WHEP endpoint — via nginx proxy em producao, direto em dev */
export const getWhepEndpointUrl = (streamKey: string): string => {
  const normalizedKey = streamKey.startsWith('stream_') ? streamKey : `stream_${streamKey}`;
  const fromEnv = import.meta.env.VITE_SRS_WHEP_URL as string | undefined;
  if (fromEnv) return `${trimSlash(fromEnv)}/?app=live&stream=${encodeURIComponent(normalizedKey)}`;
  if (import.meta.env.PROD) return `/rtc/v1/whep/?app=live&stream=${encodeURIComponent(normalizedKey)}`;
  return `http://${SRS_HOST}:${SRS_API_PORT}/rtc/v1/whep/?app=live&stream=${encodeURIComponent(normalizedKey)}`;
};

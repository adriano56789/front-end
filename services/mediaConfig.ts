import { env } from '../src/config/environment';

const trimSlash = (value: string) => value.replace(/\/+$/, '');

const SRS_HOST = env.srs.host;
const SRS_HTTP_PORT = env.srs.httpPort; // 8080

/** Base da API — nunca usar localhost em produção (VITE_API_BASE_URL em .env.prod). */
export const getApiBaseUrl = (): string => trimSlash(env.apiBaseUrl);

/** Base URL HTTP do SRS (porta 8080) — usada apenas para ferramentas/config. */
export const getVideoHttpBaseUrl = (): string => {
  const fromEnv = import.meta.env.VITE_SRS_HTTP_URL as string | undefined;
  if (fromEnv) return trimSlash(fromEnv);
  if (import.meta.env.PROD) return '/srs';
  return `http://${SRS_HOST}:${SRS_HTTP_PORT}`;
};

/**
 * SRS WHEP Playback URL (WebRTC — protocolo oficial de play do SRS).
 * O publish publica como stream_{id}, então a URL WHEP precisa do prefixo 'stream_'.
 * Passa pelo proxy do nginx do livego.store: /api/rtc/v1/whep/ → SRS:1985/rtc/v1/whep/.
 *
 * Sem HLS/LiveKit — consumo 100% WebRTC (WHEP).
 * Docs: https://ossrs.net/lts/en-us/docs/v5/doc/webrtc
 */
export const getWhepPlayUrl = (streamId: string): string => {
  const normalizedId = streamId.startsWith('stream_') ? streamId : `stream_${streamId}`;
  const base = import.meta.env.VITE_SRS_WHEP_URL || `/api/rtc/v1/whep`;
  return `${trimSlash(base)}/?app=live&stream=${encodeURIComponent(normalizedId)}`;
};

/**
 * WHEP URL por QUALIDADE do espectador (ladder do transcode FFmpeg).
 * 'auto'/'480p'/'720p'/'source' → stream original (qualidade do transmissor).
 * '360p'/'240p' → tiers leves {stream}_t360 / {stream}_t240 gerados pelo worker.
 */
export const getWhepPlayUrlForQuality = (streamId: string, quality: string): string => {
  const q = (quality || 'auto').toLowerCase();
  const tier = q === '360p' ? '_t360' : q === '240p' ? '_t240' : '';
  const normalizedId = streamId.startsWith('stream_') ? streamId : `stream_${streamId}`;
  return getWhepPlayUrl(tier ? `${normalizedId}${tier}` : normalizedId);
};

/**
 * Converte uma URL WHEP (geralmente relativa, ex: /api/rtc/v1/whep/?...) em URL
 * absoluta usando o origin atual da página.
 *
 * Por que isso importa: o SDK oficial do SRS (srs.sdk.js) constrói URLs internas
 * com `new URL(location, url)` e `xhr.open('POST', url)`. Se a base for relativa,
 * o browser lança `TypeError: Failed to construct 'URL': Invalid base URL` — o
 * exato erro visto em produção (WHEP timeout + retries infinitos). URLs absolutas
 * funcionam em qualquer versão do SDK (inclusive versões antigas em cache).
 */
export const resolveAbsoluteUrl = (url: string): string => {
  if (!url) return url;
  if (typeof window === 'undefined') return url;
  try {
    // new URL(relativa, baseAbsoluta) também valida a URL — se inválida, retorna a original.
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
};

/**
 * SRS WHIP Publish URL (WebRTC — protocolo oficial de publish do SRS).
 * O SRS publica a live como stream_{id} (com prefixo 'stream_').
 * Passa pelo proxy do nginx do livego.store: /api/rtc/v1/whip/ → SRS:1985/rtc/v1/whip/.
 *
 * SRS não precisa de STUN/TURN: o candidate público é definido no
 * rtc_server.candidate (2.25.192.154:8000) e vem no SDP answer.
 *
 * Docs: https://ossrs.net/lts/en-us/docs/v5/doc/webrtc
 */
export const getWhipPublishUrl = (streamKey: string): string => {
  const normalizedKey = streamKey.startsWith('stream_') ? streamKey : `stream_${streamKey}`;
  const base = import.meta.env.VITE_SRS_WHIP_URL || `/api/rtc/v1/whip`;
  return `${trimSlash(base)}/?app=live&stream=${encodeURIComponent(normalizedKey)}`;
};

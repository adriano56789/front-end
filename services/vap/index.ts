/**
 * Player VAP (Video Animation Player) da Tencent — vídeo com transparência real.
 *
 * Re-exporta o player oficial (Tencent/vap, pasta /web), adaptado para
 * TypeScript + React no LiveGo:
 *
 *   - `createVap(options)`  → instancia e já inicia o play (canvas transparente)
 *   - `canWebGL()`          → detecta suporte a WebGL antes de instanciar
 *   - `buildGiftVapConfig()`→ gera o config JSON na geometria dos gifts (700×3248)
 *
 * Fonte original (MIT): https://github.com/Tencent/vap — arquivos sob services/vap/.
 */
export { createVap, canWebGL } from './vapFactory';
export { buildGiftVapConfig } from './giftVapConfig';
export type { VapConfig, VapInfo, VapPlayerOptions, VapFrameData, VapFrameRegion, VapSrcItem } from './vapTypes';
export type { default as VapPlayer } from './vapWebglRender';

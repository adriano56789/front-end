/**
 * Efeito de ENTRADA na live (entrance effect) — igual ti.live/Bigo.
 *
 * Usa o pacote REAL ZEGO 6756-测试 (NO.106756 "胜利之戒进场" / Entrada da
 * Vitória), cujos arquivos originais estão em public/animations/:
 *   - entrada_efeito.mp4  (video.mp4 do pacote, VAP 752×304 @15fps, 5s,
 *                          conteúdo 750×200 + máscara alfa 375×100)
 *   - entrada_efeito.json (vapc.json do pacote, com 4 slots de fusão:
 *                          texto nome / texto "entrou na live" / avatar)
 *
 * O player VAP (Tencent) renderiza o mp4 com transparência real e funde os
 * slots de texto/imagem por frame — o mesmo mecanismo dos presentes.
 */

/** URL do mp4 do efeito de entrada (servido estaticamente pelo nginx). */
export const ENTRANCE_EFFECT_URL = '/animations/entrada_efeito.mp4';

/** URL do config VAP (vapc.json real do pacote). */
export const ENTRANCE_VAP_CONFIG_URL = '/animations/entrada_efeito.json';

/** Dimensões de EXIBIÇÃO do conteúdo (info do vapc.json). */
export const ENTRANCE_W = 750;
export const ENTRANCE_H = 200;

/** Geometria VAP do efeito de entrada (regiões do vapc.json). */
export const ENTRANCE_VAP_SPEC = {
  w: ENTRANCE_W,
  h: ENTRANCE_H,
  videoW: 752,
  videoH: 304,
  rgbFrame: [0, 0, 750, 200] as [number, number, number, number],
  aFrame: [0, 204, 375, 100] as [number, number, number, number],
  fps: 15,
};

/**
 * Slots de fusão preenchidos com os dados do usuário que entrou na live.
 * Chaves = srcTag do vapc.json ("01", "02", "03", "04").
 */
export function buildEntranceHeadData(userName: string, avatarUrl?: string): Record<string, string> {
  return {
    '01': userName,
    '02': 'entrou na live',
    ...(avatarUrl ? { '03': avatarUrl } : {}),
  };
}

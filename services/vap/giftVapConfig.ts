import { VapConfig } from './vapTypes';

/**
 * Especificação de geometria VAP de cada presente.
 *
 * 📐 Dois formatos de mp4 existem no projeto:
 *
 *   A) STACKED TOP/BOTTOM (os 9 presentes atuais) — 700×3248:
 *      ┌────────────────────────────┐
 *      │  700 × 1624  CONTEÚDO RGB  │  ← y [0, 1624)   (cores, JÁ premultiplicadas)
 *      ├────────────────────────────┤
 *      │  700 × 1624  MÁSCARA ALFA  │  ← y [1624, 3248) (escala de cinza)
 *      └────────────────────────────┘
 *
 *   B) SIDE-BY-SIDE (Caixa de Música / musicbox.mp4) — 1500×1624:
 *      ┌───────────────┬────────────────┐
 *      │  750 × 1624   │  750 × 1624    │
 *      │ CONTEÚDO RGB  │ MÁSCARA ALFA   │
 *      │ x [0, 750)    │ x [750, 1500)  │
 *      └───────────────┴────────────────┘
 *
 * O shader do VAP amostra o conteúdo em `rgbFrame` e a luminância em
 * `aFrame`, emitindo `vec4(rgb, alpha)` — o fundo nunca é exibido.
 */
export interface VapGiftSpec {
  /** Dimensões da região de conteúdo (exibição). */
  w: number;
  h: number;
  /** Dimensões totais do mp4. */
  videoW: number;
  videoH: number;
  /** Região do conteúdo colorido no vídeo. */
  rgbFrame: [number, number, number, number];
  /** Região da máscara alfa (escala de cinza) no vídeo. */
  aFrame: [number, number, number, number];
  /** fps real do arquivo. */
  fps: number;
}

export const GIFT_VAP_STANDARD: VapGiftSpec = {
  w: 700,
  h: 1624,
  videoW: 700,
  videoH: 3248,
  rgbFrame: [0, 0, 700, 1624],
  aFrame: [0, 1624, 700, 1624],
  fps: 24,
};

export const GIFT_VAP_MUSIC_BOX: VapGiftSpec = {
  w: 750,
  h: 1624,
  videoW: 1500,
  videoH: 1624,
  rgbFrame: [0, 0, 750, 1624],
  aFrame: [750, 0, 750, 1624],
  fps: 30,
};

export const GIFT_VAP_FOGUETE: VapGiftSpec = {
  w: 750,
  h: 1624,
  videoW: 750,
  videoH: 3248,
  rgbFrame: [0, 0, 750, 1624],
  aFrame: [0, 1624, 750, 1624],
  fps: 25,
};

/** fps real de cada arquivo (ffprobe). */
export const GIFT_VAP_FPS: Record<string, number> = {
  'Coração': 30,
  'Rosa': 24,
  'Pirulito': 30,
  'Planta': 30,
  'Sorvete': 24,
  'Anel': 30,
  'Champanhe': 30,
  'Caixa de Presente Rosa': 24,
  'Meu coração palpita por você': 24,
};

/** Presentes com geometria própria (fora do padrão top/bottom). */
const GIFT_VAP_SPECIAL: Record<string, VapGiftSpec> = {
  'Caixa de Música': GIFT_VAP_MUSIC_BOX,
  'Foguete': GIFT_VAP_FOGUETE,
};

export const GIFT_VAP_DEFAULT_FPS = 24;

/**
 * Retorna a especificação VAP de um gift (geometria + fps).
 */
export function getGiftVapSpec(giftName: string): VapGiftSpec {
  const special = GIFT_VAP_SPECIAL[giftName];
  if (special) return special;
  return {
    ...GIFT_VAP_STANDARD,
    fps: GIFT_VAP_FPS[giftName] ?? GIFT_VAP_DEFAULT_FPS,
  };
}

/**
 * Monta o config VAP para um gift (sem fusão de imagem/texto por enquanto —
 * `src` e `frame` vazios; a transparência vem da máscara alfa embutida).
 */
export function buildGiftVapConfig(giftName: string): VapConfig {
  const spec = getGiftVapSpec(giftName);
  return {
    info: {
      v: 2,
      w: spec.w,
      h: spec.h,
      videoW: spec.videoW,
      videoH: spec.videoH,
      orien: 0,
      fps: spec.fps,
      aFrame: [spec.aFrame[0], spec.aFrame[1], spec.aFrame[2], spec.aFrame[3]],
      rgbFrame: [spec.rgbFrame[0], spec.rgbFrame[1], spec.rgbFrame[2], spec.rgbFrame[3]],
    },
    src: [],
    frame: [],
  };
}

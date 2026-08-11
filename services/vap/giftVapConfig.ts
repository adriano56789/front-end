import { VapConfig } from './vapTypes';

/**
 * Especificação de geometria VAP de cada presente.
 *
 * 📐 Os 10 presentes padrão (os 9 + Foguete) usam mp4 SIDE-BY-SIDE 1500×1624:
 *
 *   SIDE-BY-SIDE — 1500×1624 (esquerda = conteúdo, direita = máscara):
 *      ┌───────────────┬────────────────┐
 *      │  750 × 1624   │  750 × 1624    │
 *      │ CONTEÚDO RGB  │ MÁSCARA ALFA   │
 *      │ x [0, 750)    │ x [750, 1500)  │
 *      └───────────────┴────────────────┘
 *
 *   Esse é o formato nativo dos pacotes ZEGO VAP (conteúdo + alfa no mesmo
 *   frame). Aqui o conteúdo fica à ESQUERDA e a máscara à DIREITA.
 *
 *   A Caixa de Música usa o webm ZEGO (musicbox.webm) 752×304:
 *      conteúdo RGB em [0, 0, 750, 200] e alfa em [0, 204, 375, 100]
 *      (coordenadas do vapc.json da ZEGO: v=2, w=750, h=200, fps=15).
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
  w: 750,
  h: 1624,
  videoW: 1500,
  videoH: 1624,
  rgbFrame: [0, 0, 750, 1624],
  aFrame: [750, 0, 750, 1624],
  fps: 24,
};

// 🎵 Caixa de Música — webm ZEGO VAP (pacote 6756-测试): conteúdo 750×200,
// vídeo 752×304, regiões RGB/alfa lidas do vapc.json (v=2, fps=15).
export const GIFT_VAP_MUSIC_BOX: VapGiftSpec = {
  w: 750,
  h: 200,
  videoW: 752,
  videoH: 304,
  rgbFrame: [0, 0, 750, 200],
  aFrame: [0, 204, 375, 100],
  fps: 15,
};

// 🚀 Foguete — side-by-side 1500×1624 igual aos demais. fps do placeholder
// (antigo foguete 750×3248 @25). Quando o NOVO foguete (750×1624 @30, canal
// único) for convertido, atualizar aqui para fps: 30.
export const GIFT_VAP_FOGUETE: VapGiftSpec = {
  w: 750,
  h: 1624,
  videoW: 1500,
  videoH: 1624,
  rgbFrame: [0, 0, 750, 1624],
  aFrame: [750, 0, 750, 1624],
  fps: 25,
};

// 🪽 Asas de Anjo — pacote 翅膀 (NO.102834), config lida do vapc.json:
// vídeo 1136×1632 @30fps, conteúdo 750×1624 (esquerda) e alfa 375×812 em
// [754,0] (topo-direita; o player escala a máscara para cobrir o conteúdo).
export const GIFT_VAP_ASAS_DE_ANJO: VapGiftSpec = {
  w: 750,
  h: 1624,
  videoW: 1136,
  videoH: 1632,
  rgbFrame: [0, 0, 750, 1624],
  aFrame: [754, 0, 375, 812],
  fps: 30,
};

/** fps real de cada arquivo (ffprobe). */
export const GIFT_VAP_FPS: Record<string, number> = {
  'Rosa': 24,
  'Pirulito': 30,
  'Planta': 30,
  'Sorvete': 24,
  'Anel': 30,
  'Champanhe': 30,
  'Caixa de Presente Rosa': 24,
  'Meu coração palpita por você': 24,
  'Asas de Anjo': 30,
};

// 🌸 Moldura de avatar "Primavera" — pacote ZEGO 20275 (20275_bmp.json):
// vídeo 608×400 @15fps, conteúdo 400×400 à esquerda + máscara alfa 200×200
// em [404,0] (o player escala a máscara 2× para cobrir o conteúdo), 60 frames
// = 4.0s. Roda em LOOP ao redor do avatar.
export const GIFT_VAP_FRAME_PRIMAVERA: VapGiftSpec = {
  w: 400,
  h: 400,
  videoW: 608,
  videoH: 400,
  rgbFrame: [0, 0, 400, 400],
  aFrame: [404, 0, 200, 200],
  fps: 15,
};

/** Presentes com geometria própria (fora do padrão side-by-side). */
const GIFT_VAP_SPECIAL: Record<string, VapGiftSpec> = {
  'Caixa de Música': GIFT_VAP_MUSIC_BOX,
  'Foguete': GIFT_VAP_FOGUETE,
  'Asas de Anjo': GIFT_VAP_ASAS_DE_ANJO,
};

/** Molduras de avatar com geometria VAP própria (animação do pacote). */
const FRAME_VAP_SPECS: Record<string, VapGiftSpec> = {
  'Frame20275': GIFT_VAP_FRAME_PRIMAVERA,
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
  return buildVapConfigFromSpec(spec);
}

/**
 * Monta o config VAP para uma MOLDURA de avatar (id do frame).
 */
export function buildFrameVapConfig(frameId: string): VapConfig {
  const spec = FRAME_VAP_SPECS[frameId];
  if (!spec) throw new Error(`[VAP] sem spec de moldura: ${frameId}`);
  return buildVapConfigFromSpec(spec);
}

function buildVapConfigFromSpec(spec: VapGiftSpec): VapConfig {
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

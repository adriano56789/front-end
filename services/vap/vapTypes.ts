/*
 * Tencent is pleased to support the open source community by making vap available.
 *
 * Copyright (C) 2020 Tencent.  All rights reserved.
 *
 * Licensed under the MIT License (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 *
 * http://opensource.org/licenses/MIT
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is
 * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Tipos do VAP (Video Animation Player) — player oficial da Tencent para
 * vídeo com transparência real (canal alfa embutido no próprio mp4).
 *
 * Extraído de https://github.com/Tencent/vap (pasta /web) e adaptado para
 * TypeScript + React no LiveGo.
 */

/** Região de um elemento de fusão (imagem/texto) num frame específico. */
export interface VapFrameRegion {
  /** Referência ao item declarado em `src` (ex.: "1", "2"). */
  srcId: string;
  /** Camada/z-index da fusão. */
  z: number;
  /** [x, y, w, h] da posição FINAL de exibição (coordenadas de exibição). */
  frame: [number, number, number, number];
  /** [x, y, w, h] da máscara correspondente (coordenadas do vídeo). */
  mFrame: [number, number, number, number];
  mt?: number;
}

/** Definição de um frame que contém elementos de fusão. */
export interface VapFrameData {
  /** Índice do frame (0-based) em que a fusão deve aparecer. */
  i: number;
  obj?: VapFrameRegion[];
}

/** Item declarado em `src` (imagem ou texto a ser fundido no vídeo). */
export interface VapSrcItem {
  srcId: string;
  srcType: 'img' | 'txt';
  /** Placeholder tipo `[imgUser]` — vira o valor passado nas options (ext). */
  srcTag: string;
  w: number;
  h: number;
  color?: string;
  style?: string;
  fontStyle?: unknown;
  fitType?: string;
  img?: HTMLImageElement | ImageData;
  textStr?: string;
  imgUrl?: string;
}

/** Bloco `info` do config JSON do VAP. */
export interface VapInfo {
  v: number;
  /** Largura/altura de EXIBIÇÃO (região RGB). */
  w: number;
  h: number;
  /** Dimensões do vídeo inteiro (incluindo a região de alfa). */
  videoW: number;
  videoH: number;
  orien?: number;
  fps: number;
  /** Região [x, y, w, h] da máscara alfa DENTRO do vídeo. */
  aFrame: [number, number, number, number];
  /** Região [x, y, w, h] do conteúdo RGB DENTRO do vídeo. */
  rgbFrame: [number, number, number, number];
}

/** Config JSON do VAP — pode ser objeto ou URL de um .json. */
export interface VapConfig {
  info: VapInfo;
  src?: VapSrcItem[];
  frame?: VapFrameData[];
}

export interface VapPlayerOptions {
  /** DOM container onde o canvas transparente será montado. */
  container: HTMLElement;
  /** URL do mp4 de animação. */
  src: string;
  /** Objeto de config JSON (ou URL do .json). */
  config: VapConfig | string;
  /** fps declarado na geração do material (fallback; o config.info.fps vence). */
  fps?: number;
  /** Largura do canvas (backing store). Default: info.w. */
  width?: number;
  /** Altura do canvas (backing store). Default: info.h. */
  height?: number;
  /** Loop infinito. */
  loop?: boolean;
  /** Mudo (necessário para autoplay). */
  mute?: boolean;
  /** Pré-carregar o mp4 via fetch+blob antes de tocar. */
  precache?: boolean;
  /** Modo preciso (requestVideoFrameCallback). Fallback automático. */
  accurate?: boolean;
  /** Ponto inicial de reprodução (s). */
  beginPoint?: number;
  /** Offset de frame (suporte a materiais problemáticos). */
  offset?: number;
  onLoadError?: (err: unknown) => void;
  onDestroy?: () => void;
  /** Campos extras de fusão (ex.: imgUser, textUser) — espelham o config. */
  [key: string]: unknown;
}

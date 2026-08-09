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

import { VapConfig, VapFrameData, VapSrcItem } from './vapTypes';

/**
 * Parser do config JSON do VAP (extraído de Tencent/vap/web/src/vap-frame-parser.ts).
 *
 * Responsável por:
 *   - carregar o config (objeto ou URL .json);
 *   - resolver os recursos de fusão (imagens/texto) declarados em `src`;
 *   - manter o mapa de texturas e os dados de frame por índice.
 */
export default class VapFrameParser {
  public config: VapConfig | string;
  public textureMap: Record<string, number> = {};
  public srcData: Record<string, VapSrcItem> = {};
  private headData: Record<string, unknown>;
  private frame: VapFrameData[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(source: VapConfig | string, headData: Record<string, unknown>) {
    this.config = source;
    this.headData = headData;
  }

  async init() {
    let config: VapConfig = this.config as VapConfig;
    if (typeof this.config === 'string' && /\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]\.json/.test(this.config)) {
      config = await this.getConfigBySrc(this.config);
    }
    await this.parseSrc(config);
    this.frame = config.frame || [];
    this.config = config;
    return this;
  }

  initCanvas() {
    if (!this.canvas) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.style.display = 'none';
      document.body.appendChild(canvas);
      this.ctx = ctx;
      this.canvas = canvas;
    }
  }

  loadImg(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        console.error('vap: frame 资源加载失败:', url);
        reject(new Error('frame resource load failed: ' + url));
      };
      img.src = url;
    });
  }

  async parseSrc(dataJson: VapConfig): Promise<void> {
    const src: Record<string, VapSrcItem> = {};
    await Promise.all(
      (dataJson.src || []).map(async (item) => {
        item.img = null;
        if (!this.headData[item.srcTag.slice(1, item.srcTag.length - 1)] && !this.headData[item.srcTag]) {
          console.warn(`vap: 融合信息没有传入：${item.srcTag}`);
        } else {
          if (item.srcType === 'txt') {
            if (this.headData['fontStyle'] && !item['fontStyle']) {
              item['fontStyle'] = this.headData['fontStyle'];
            }
            item.textStr =
              (this.headData[item.srcTag] as string) ||
              item.srcTag.replace(/\[(.*)\]/, ($0, $1) => this.headData[$1] as string);
            this.initCanvas();
            item.img = this.makeTextImg(item);
          } else if (item.srcType === 'img') {
            item.imgUrl =
              (this.headData[item.srcTag] as string) ||
              item.srcTag.replace(/\[(.*)\]/, ($0, $1) => this.headData[$1] as string);
            try {
              item.img = await this.loadImg(item.imgUrl);
            } catch {
              // ignora: imagem opcional de fusão
            }
          }
          if (item.img) {
            src[item.srcId] = item;
          }
        }
      })
    );
    this.srcData = src;
    if (this.canvas) {
      this.canvas.parentNode?.removeChild(this.canvas);
      this.canvas = null;
      this.ctx = null;
    }
  }

  /** Baixa o config JSON por URL. */
  getConfigBySrc(jsonUrl: string): Promise<VapConfig> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', jsonUrl, true);
      xhr.responseType = 'json';
      xhr.onload = function () {
        if (xhr.status === 200 || (xhr.status === 304 && xhr.response)) {
          resolve(xhr.response);
        } else {
          reject(new Error('http response invalid: ' + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error('network error'));
      xhr.send();
    });
  }

  /** Converte um texto em ImageData para ser fundido no frame. */
  makeTextImg(item: VapSrcItem): ImageData | null {
    if (!this.ctx) return null;
    const { textStr, w, h, color, style, fontStyle } = item;
    const ctx = this.ctx;
    ctx.canvas.width = w;
    ctx.canvas.height = h;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const getFontStyle = function () {
      const fontSize = Math.min(w / (textStr || 'x').length, h - 8);
      const font = [`${fontSize}px`, 'Arial'];
      if (style === 'b') {
        font.unshift('bold');
      }
      return font.join(' ');
    };
    if (!fontStyle) {
      ctx.font = getFontStyle();
      ctx.fillStyle = color || '#ffffff';
    } else if (typeof fontStyle === 'string') {
      ctx.font = fontStyle;
      ctx.fillStyle = color || '#ffffff';
    } else if (typeof fontStyle === 'object' && fontStyle) {
      const fs = fontStyle as { font?: string; color?: string };
      ctx.font = fs['font'] || getFontStyle();
      ctx.fillStyle = fs['color'] || color || '#ffffff';
    } else if (typeof fontStyle === 'function') {
      ctx.font = getFontStyle();
      ctx.fillStyle = color || '#ffffff';
      (fontStyle as (c: CanvasRenderingContext2D, i: VapSrcItem) => void).call(null, ctx, item);
    }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillText(textStr || '', w / 2, h / 2);
    return ctx.getImageData(0, 0, w, h);
  }

  getFrame(frame: number): VapFrameData | undefined {
    return this.frame.find((item) => item.i === frame);
  }
}

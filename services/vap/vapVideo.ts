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

import { VapPlayerOptions } from './vapTypes';

const DEFAULT_OPTIONS = {
  src: '',
  loop: false,
  fps: 20,
  container: null as HTMLElement | null,
  precache: false,
  mute: false,
  config: '' as VapPlayerOptions['config'],
  accurate: false,
  offset: 0,
  width: undefined as number | undefined,
  height: undefined as number | undefined,
};

type EventCallback = (...args: any[]) => void;

/**
 * Base do player VAP (extraído de Tencent/vap/web/src/video.ts) com adaptações:
 *
 * ⚠️ FIX iOS/Safari + WebViews Android: o original usa `video.style.display = 'none'`
 * para esconder o <video>. Nesses navegadores o elemento com display:none não é
 * composto, e `texImage2D(video)` / `drawImage(video)` devolvem frame PRETO —
 * a animação some (mostra só o fundo). Mantemos o <video> RENDERIZADO porém
 * FORA DA VIEWPORT (offscreen, posição fixa em -2000px), com o tamanho real
 * do frame — o canvas transparente é a única coisa visível na tela.
 */
export default class VapVideo {
  public options: VapPlayerOptions;
  public requestAnim: (cb: EventCallback) => number = () => 0;
  public container!: HTMLElement;
  public video!: HTMLVideoElement;
  protected events: Record<string, EventCallback[]> = {};
  protected animId = 0;
  protected useFrameCallback = false;
  private drawFrameBound: ((...args: any[]) => void) | null = null;
  private firstPlaying = true;
  private setBegin = true;
  private customEvent: string[] = ['frame', 'percentage', ''];

  constructor() {
    this.options = { ...DEFAULT_OPTIONS };
  }

  setOptions(options: VapPlayerOptions) {
    if (!options.container || !options.src) {
      console.warn('[VAP] options container and src cannot be empty!');
    }
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.setBegin = true;
    this.useFrameCallback = false;
    this.container = this.options.container as HTMLElement;
    if (!this.options.src || !this.options.config || !this.options.container) {
      console.error('[VAP] params error: src(视频地址)、config(配置文件地址)、container(dom容器)');
    }
    return this;
  }

  /** Pré-carrega o mp4 via fetch→blob (iOS precisa de passos extras). */
  precacheSource(source: string): Promise<string> {
    const URLImpl = (window as any).webkitURL || window.URL;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', source, true);
      xhr.responseType = 'blob';
      xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 304) {
          const res = xhr.response;
          if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
            const fileReader = new FileReader();
            fileReader.onloadend = function () {
              const resultStr = fileReader.result as string;
              const raw = atob(resultStr.slice(resultStr.indexOf(',') + 1));
              const buf = Array(raw.length);
              for (let d = 0; d < raw.length; d++) {
                buf[d] = raw.charCodeAt(d);
              }
              const arr = new Uint8Array(buf);
              const blob = new Blob([arr], { type: 'video/mp4' });
              resolve(URLImpl.createObjectURL(blob));
            };
            fileReader.readAsDataURL(xhr.response);
          } else {
            resolve(URLImpl.createObjectURL(res));
          }
        } else {
          reject(new Error('http response invalid: ' + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error('network error'));
      xhr.send();
    });
  }

  initVideo() {
    const options = this.options;
    let video = this.video;
    if (!video) {
      video = this.video = document.createElement('video');
    }
    video.crossOrigin = 'anonymous';
    video.autoplay = false;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    if (options.mute) {
      video.muted = true;
      video.volume = 0;
    }
    // ⚠️ FIX iOS: offscreen renderizado (nunca display:none).
    video.loop = !!options.loop;
    video.style.position = 'fixed';
    video.style.left = '-2000px';
    video.style.top = '0';
    video.style.opacity = '1';
    video.style.pointerEvents = 'none';
    video.style.zIndex = '-1';
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('tabindex', '-1');
    // Define o tamanho real do frame assim que o metadata chegar (garante que
    // o frame seja extraível em texImage2D/drawImage mesmo em WebView Android).
    video.addEventListener('loadedmetadata', () => {
      if (video.videoWidth) {
        video.style.width = video.videoWidth + 'px';
        video.style.height = video.videoHeight + 'px';
      }
    });

    if (options.precache) {
      this.precacheSource(options.src)
        .then((blob) => {
          video.src = blob;
          document.body.appendChild(video);
        })
        .catch((e) => console.error(e));
    } else {
      video.src = options.src;
      document.body.appendChild(video);
      video.load();
    }

    this.firstPlaying = true;
    if ('requestVideoFrameCallback' in this.video) {
      this.useFrameCallback = !!options.accurate;
    }
    this.cancelRequestAnimation();

    this.offAll();
    ['playing', 'error', 'canplay'].forEach((item) => {
      this.on(item, (this as any)['on' + item].bind(this));
    });
  }

  drawFrame(_?: unknown, _info?: unknown) {
    this.drawFrameBound = this.drawFrameBound || this.drawFrame.bind(this);
    if (this.useFrameCallback) {
      this.animId = this.video.requestVideoFrameCallback(this.drawFrameBound);
    } else {
      this.animId = this.requestAnim(this.drawFrameBound);
    }
  }

  play() {
    if (this.useFrameCallback) {
      this.animId = this.video.requestVideoFrameCallback(this.drawFrame.bind(this));
    } else {
      this.requestAnim = this.requestAnimFunc();
    }

    const prom = this.video && this.video.play();
    if (prom && (prom as Promise<void>).then) {
      (prom as Promise<void>).catch(() => {
        if (!this.video) return;
        this.video.muted = true;
        this.video.volume = 0;
        this.video.play().catch((e) => {
          this.trigger('error', e);
        });
      });
    }
  }

  pause() {
    this.video && this.video.pause();
  }

  setTime(t: number) {
    if (this.video) {
      this.video.currentTime = t;
    }
  }

  requestAnimFunc(): (cb: EventCallback) => number {
    const fps = this.options.fps || 30;
    if (window.requestAnimationFrame) {
      let index = -1;
      return (cb) => {
        index++;
        return requestAnimationFrame(() => {
          if (!(index % Math.round(60 / fps))) {
            return cb();
          }
          this.animId = this.requestAnim(cb);
        });
      };
    }
    return (cb) => {
      return window.setTimeout(cb, 1000 / fps) as unknown as number;
    };
  }

  cancelRequestAnimation() {
    if (!this.animId) return;
    if (this.useFrameCallback) {
      try {
        this.video.cancelVideoFrameCallback(this.animId);
      } catch (e) {
        console.error(e);
      }
    } else if (window.cancelAnimationFrame) {
      cancelAnimationFrame(this.animId);
    } else {
      clearTimeout(this.animId);
    }
    this.animId = 0;
  }

  clear() {
    this.cancelRequestAnimation();
  }

  destroy() {
    this.cancelRequestAnimation();
    if (this.video) {
      this.offAll();
      this.video.parentNode && this.video.parentNode.removeChild(this.video);
      this.video = null as unknown as HTMLVideoElement;
    }
    this.options.onDestroy && this.options.onDestroy();
  }

  on(event: string, callback: EventCallback) {
    const cbs = this.events[event] || [];
    cbs.push(callback);
    this.events[event] = cbs;
    if (this.customEvent.indexOf(event) === -1) {
      this.video.addEventListener(event, callback);
    }
    return this;
  }

  once(event: string, callback: EventCallback) {
    const once = (...e: any[]) => {
      const cbs = this.events[event];
      cbs.splice(cbs.indexOf(once), 1);
      this.video.removeEventListener(event, once);
      callback(...e);
    };
    return this.on(event, once);
  }

  trigger(eventName: string, ...e: any[]) {
    try {
      (this.events[eventName] || []).forEach((item) => item(...e));
    } catch (err) {
      console.error(err);
    }
  }

  offAll() {
    Object.keys(this.events).forEach((name) => {
      const cbs = this.events[name];
      if (cbs && cbs.length) {
        cbs.forEach((cb) => this.video.removeEventListener(name, cb));
      }
    });
    this.events = {};
    return this;
  }

  onplaying() {
    if (this.firstPlaying) {
      this.firstPlaying = false;
      if (!this.useFrameCallback) {
        this.drawFrame(null, null);
      }
    }
  }

  oncanplay() {
    const begin = this.options.beginPoint;
    if (begin && this.setBegin) {
      this.setBegin = false;
      this.video.currentTime = begin;
    }
  }

  onerror(err: Event) {
    console.error('[VAP] play error: ', err);
    this.destroy();
    this.options.onLoadError && this.options.onLoadError(err);
  }
}

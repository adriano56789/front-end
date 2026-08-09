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
import WebglRenderVap from './vapWebglRender';

let isCanWebGL: boolean | undefined;

/** Verifica se o browser suporta WebGL (necessário para o VAP). */
export function canWebGL(): boolean {
  if (typeof isCanWebGL !== 'undefined') {
    return isCanWebGL;
  }
  try {
    if (!(window as any).WebGLRenderingContext) {
      isCanWebGL = false;
      return isCanWebGL;
    }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    isCanWebGL = !!context;
    return isCanWebGL;
  } catch {
    isCanWebGL = false;
    return isCanWebGL;
  }
}

/**
 * Instancia o player VAP (Video Animation Player) oficial da Tencent.
 *
 * O constructor já inicia o play com as options passadas — o container recebe
 * um <canvas> TRANSPARENTE sobreposto ao conteúdo, e o <video> fica oculto.
 */
export function createVap(options: VapPlayerOptions): WebglRenderVap {
  if (!canWebGL()) {
    throw new Error('your browser not support webgl');
  }
  return new WebglRenderVap(options);
}

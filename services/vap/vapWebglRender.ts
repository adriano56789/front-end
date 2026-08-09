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
import VapFrameParser from './vapFrameParser';
import * as glUtil from './vapGlUtil';
import VapVideo from './vapVideo';

const PER_SIZE = 9;

/**
 * Converte [x, y, w, h] em coordenadas de texto WebGL [left, right, bottom, top].
 */
function computeCoord(x: number, y: number, w: number, h: number, vw: number, vh: number) {
  return [x / vw, (x + w) / vw, (vh - y - h) / vh, (vh - y) / vh];
}

/**
 * Renderizador WebGL do VAP (extraído de Tencent/vap/web/src/webgl-render-vap.ts).
 *
 * O <video> é usado apenas como fonte de frames; um shader personalizado amostra
 * o conteúdo RGB na região `rgbFrame` e a luminância na região `aFrame` e emite
 * `vec4(rgb, alpha)` num canvas TRANSPARENTE — o fundo preto do mp4 nunca é
 * exibido. Com suporte opcional a fusão de imagens/texto por frame (config.frame).
 */
export default class WebglRenderVap extends VapVideo {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private vertexShader: WebGLShader | null = null;
  private fragmentShader: WebGLShader | null = null;
  private program: WebGLProgram | null = null;
  private textures: WebGLTexture[] = [];
  private videoTexture: WebGLTexture | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private vapFrameParser: VapFrameParser | null = null;
  private imagePosLoc: WebGLUniformLocation | null = null;
  private contextLost = false;

  constructor(options?: VapPlayerOptions) {
    super();
    if (options) {
      this.play(options);
    }
  }

  play(options?: VapPlayerOptions) {
    if (options) {
      this.setOptions(options);
    }
    if (!this.options?.config) {
      console.error('[VAP] options.config cannot be empty.');
      return this;
    }
    if (options) {
      this.initVideo();
      this.vapFrameParser = new VapFrameParser(this.options.config, this.options as unknown as Record<string, unknown>);
      this.vapFrameParser
        .init()
        .then(() => {
          if (!this.vapFrameParser) return;
          this.initWebGL();
          this.initTexture();
          this.initVideoTexture();
          const fps = this.vapFrameParser.config && typeof this.vapFrameParser.config === 'object'
            ? this.vapFrameParser.config.info.fps
            : undefined;
          this.options.fps = fps || 30;
          super.play();
        })
        .catch((e) => {
          this.vapFrameParser = null;
          console.error('[VAP] parse vap frame error.', e);
          return this;
        });
    } else {
      super.play();
    }
    return this;
  }

  initWebGL() {
    const { width, height } = this.options;
    const parser = this.vapFrameParser;
    if (!parser || typeof parser.config === 'string') return null;
    const { w, h } = parser.config.info;

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }
    this.canvas.width = width || w;
    this.canvas.height = height || h;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.container.appendChild(this.canvas);

    if (!this.gl) {
      this.gl =
        this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }) ||
        (this.canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: true }) as WebGLRenderingContext | null);
      if (!this.gl) {
        throw new Error('[VAP] webgl not supported');
      }
      this.gl.disable(this.gl.BLEND);
      this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
      this.contextLost = false;
      this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    if (!this.vertexShader) {
      this.vertexShader = this.initVertexShader(this.gl);
    }

    if (this.fragmentShader && this.program) {
      glUtil.cleanWebGL(this.gl, { program: this.program, shaders: [this.fragmentShader] });
      this.fragmentShader = null;
      this.program = null;
    }

    const { srcData } = parser;
    this.fragmentShader = this.initFragmentShader(this.gl, Object.keys(srcData).length);
    this.program = glUtil.createProgram(this.gl, this.vertexShader, this.fragmentShader);
    this.imagePosLoc = null;
    return this.gl;
  }

  initVertexShader(gl: WebGLRenderingContext) {
    return glUtil.createShader(
      gl,
      gl.VERTEX_SHADER,
      `attribute vec2 a_position;
             attribute vec2 a_texCoord;
             attribute vec2 a_alpha_texCoord;
             varying vec2 v_alpha_texCoord;
             varying vec2 v_texcoord;
             void main(void){
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texcoord = a_texCoord;
                v_alpha_texCoord = a_alpha_texCoord;
             }`
    );
  }

  initFragmentShader(gl: WebGLRenderingContext, textureSize: number) {
    const bgColor = `vec4(texture2D(u_image_video, v_texcoord).rgb, texture2D(u_image_video, v_alpha_texCoord).r);`;
    let sourceTexture = '';
    let sourceUniform = '';

    if (textureSize > 0) {
      const bufferSize = textureSize * PER_SIZE;
      const imgColor: string[] = [];
      const samplers: string[] = [];
      for (let i = 0; i < textureSize; i++) {
        imgColor.push(
          `if(ndx == ${i + 1}){
                color = texture2D(u_image${i + 1}, uv);
            }`
        );
        samplers.push(`uniform sampler2D u_image${i + 1};`);
      }

      sourceUniform = `
            ${samplers.join('\n')}
            uniform float image_pos[${bufferSize}];
            vec4 getSampleFromArray(int ndx, vec2 uv) {
                vec4 color;
                ${imgColor.join(' else ')}
                return color;
            }
            `;
      sourceTexture = `
            vec4 srcColor, maskColor;
            vec2 srcTexcoord, maskTexcoord;
            int srcIndex;
            float x1, x2, y1, y2, mx1, mx2, my1, my2;

            for (int i = 0; i < ${bufferSize}; i += ${PER_SIZE}) {
                if ((int(image_pos[i]) > 0)) {
                    srcIndex = int(image_pos[i]);

                    x1 = image_pos[i + 1];
                    x2 = image_pos[i + 2];
                    y1 = image_pos[i + 3];
                    y2 = image_pos[i + 4];

                    mx1 = image_pos[i + 5];
                    mx2 = image_pos[i + 6];
                    my1 = image_pos[i + 7];
                    my2 = image_pos[i + 8];

                    if (v_texcoord.s > x1 && v_texcoord.s < x2 && v_texcoord.t > y1 && v_texcoord.t < y2) {
                        srcTexcoord = vec2((v_texcoord.s - x1) / (x2 - x1), (v_texcoord.t - y1) / (y2 - y1));
                        maskTexcoord = vec2(mx1 + srcTexcoord.s * (mx2 - mx1), my1 + srcTexcoord.t * (my2 - my1));
                        srcColor = getSampleFromArray(srcIndex, srcTexcoord);
                        maskColor = texture2D(u_image_video, maskTexcoord);
                        srcColor.a = srcColor.a * (maskColor.r);

                        bgColor = vec4(srcColor.rgb * srcColor.a, srcColor.a) + (1.0 - srcColor.a) * bgColor;
                    }
                }
            }
            `;
    }

    const fragmentShader = `
        precision lowp float;
        varying vec2 v_texcoord;
        varying vec2 v_alpha_texCoord;
        uniform sampler2D u_image_video;
        ${sourceUniform}

        void main(void) {
            vec4 bgColor = ${bgColor}
            ${sourceTexture}
            gl_FragColor = bgColor;
        }
        `;
    return glUtil.createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
  }

  initTexture() {
    const { gl, vapFrameParser, textures } = this;
    if (!gl || !vapFrameParser || !vapFrameParser.srcData) {
      return;
    }

    const resources = vapFrameParser.srcData;
    // 0 é o vídeo
    let i = 1;
    for (const key in resources) {
      const resource = resources[key];
      const texture = textures[i - 1];
      if (texture) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resource.img as TexImageSource);
      } else {
        this.textures.push(glUtil.createTexture(gl, i, resource.img as TexImageSource));
      }
      const sampler = gl.getUniformLocation(this.program as WebGLProgram, `u_image${i}`);
      gl.uniform1i(sampler, i);
      vapFrameParser.textureMap[resource.srcId] = i++;
    }
  }

  initVideoTexture() {
    const { gl, vapFrameParser, program } = this;
    if (!gl || !vapFrameParser || typeof vapFrameParser.config === 'string' || !vapFrameParser.config.info) {
      return;
    }

    if (!this.videoTexture) {
      this.videoTexture = glUtil.createTexture(gl, 0);
    }

    const sampler = gl.getUniformLocation(program as WebGLProgram, 'u_image_video');
    gl.uniform1i(sampler, 0);
    gl.activeTexture(gl.TEXTURE0);

    const info = vapFrameParser.config.info;
    const { videoW: vW, videoH: vH } = info;
    const [rgbX, rgbY, rgbW, rgbH] = info.rgbFrame;
    const [aX, aY, aW, aH] = info.aFrame;
    const rgbCoord = computeCoord(rgbX, rgbY, rgbW, rgbH, vW, vH);
    const aCoord = computeCoord(aX, aY, aW, aH, vW, vH);
    const view = new Float32Array([
      ...[-1, 1, rgbCoord[0], rgbCoord[3], aCoord[0], aCoord[3]],
      ...[1, 1, rgbCoord[1], rgbCoord[3], aCoord[1], aCoord[3]],
      ...[-1, -1, rgbCoord[0], rgbCoord[2], aCoord[0], aCoord[2]],
      ...[1, -1, rgbCoord[1], rgbCoord[2], aCoord[1], aCoord[2]],
    ]);

    if (!this.vertexBuffer) {
      this.vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    }
    gl.bufferData(gl.ARRAY_BUFFER, view, gl.STATIC_DRAW);

    const size = view.BYTES_PER_ELEMENT;
    const aPosition = gl.getAttribLocation(program as WebGLProgram, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, size * 6, 0);

    const aTexCoord = gl.getAttribLocation(program as WebGLProgram, 'a_texCoord');
    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, size * 6, size * 2);

    const aAlphaTexCoord = gl.getAttribLocation(program as WebGLProgram, 'a_alpha_texCoord');
    gl.enableVertexAttribArray(aAlphaTexCoord);
    gl.vertexAttribPointer(aAlphaTexCoord, 2, gl.FLOAT, false, size * 6, size * 4);
  }

  drawFrame(_?: unknown, info?: any) {
    const { gl, vapFrameParser, video, options } = this;
    if (!gl) {
      super.drawFrame(_, info);
      return;
    }

    const frame =
      !options.loop && info?.presentedFrames > 0
        ? info.presentedFrames - 1
        : Math.round(video.currentTime * (options.fps || 30)) + (options.offset || 0);
    const frameData = vapFrameParser ? vapFrameParser.getFrame(frame) : undefined;

    if (frameData?.obj && vapFrameParser) {
      let posArr: number[] = [];
      const { videoW: vW, videoH: vH, rgbFrame } = vapFrameParser.config && typeof vapFrameParser.config === 'object'
        ? vapFrameParser.config.info
        : { videoW: 1, videoH: 1, rgbFrame: [0, 0, 1, 1] as [number, number, number, number] };
      frameData.obj.forEach((frameItem) => {
        const imgIndex = vapFrameParser.textureMap[frameItem.srcId];
        if (imgIndex > 0) {
          posArr[posArr.length] = imgIndex;
          const [rgbX, rgbY] = rgbFrame;
          const [x, y, w, h] = frameItem.frame;
          const [mX, mY, mW, mH] = frameItem.mFrame;
          const coord = computeCoord(x + rgbX, y + rgbY, w, h, vW, vH);
          const mCoord = computeCoord(mX, mY, mW, mH, vW, vH);
          posArr = posArr.concat(coord).concat(mCoord);
        }
      });
      if (posArr.length) {
        this.imagePosLoc = this.imagePosLoc || gl.getUniformLocation(this.program as WebGLProgram, 'image_pos');
        gl.uniform1fv(this.imagePosLoc, new Float32Array(posArr));
      }
    }

    this.trigger('frame', frame + 1, frameData, vapFrameParser && typeof vapFrameParser.config === 'object' ? vapFrameParser.config : {});

    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.video);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    super.drawFrame(_, info);
  }

  clear() {
    super.clear();
    const { gl } = this;
    if (gl) {
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  onContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.clear();
  };

  destroy() {
    super.destroy();
    if (this.canvas) {
      this.canvas.parentNode && this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null;
    }
    if (this.gl) {
      glUtil.cleanWebGL(this.gl, {
        program: this.program,
        shaders: [this.vertexShader as WebGLShader, this.fragmentShader as WebGLShader],
        textures: [...this.textures, this.videoTexture as WebGLTexture],
        buffers: [this.vertexBuffer as WebGLBuffer],
      });
    }
    this.gl = null;
    this.vertexShader = null;
    this.fragmentShader = null;
    this.program = null;
    this.imagePosLoc = null;
    this.vertexBuffer = null;
    this.videoTexture = null;
    this.textures = [];
  }
}

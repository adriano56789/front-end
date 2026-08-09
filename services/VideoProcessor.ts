// Serviço de processamento de vídeo em tempo real com efeitos de beleza
// Implementação completa com WebGL para performance via GPU

import { BabyFaceProcessor } from './BabyFaceProcessor';

export interface VideoProcessorConfig {
  width: number;
  height: number;
  fps: number;
  quality: 'low' | 'medium' | 'high';
}

export interface BeautyEffectSettings {
  whitening: number;        // Branquear (0-100)
  smoothing: number;        // Alisar a pele (0-100)  
  saturation: number;        // Ruborizar (0-100)
  contrast: number;         // Contraste (0-100)
  babyFace: number;         // Rosto Bebê (0-100) — rejuvenesce o rosto
  selectedFilter?: string;
}

export class VideoProcessor {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private stream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  private processingVideoElement: HTMLVideoElement | null = null;
  
  private animationId: number | null = null;
  private isProcessing = false;
  
  // WebGL resources
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private textureBuffer: WebGLBuffer | null = null;
  private videoTexture: WebGLTexture | null = null;
  
  // Shader uniforms
  private uniformLocations: {
    resolution: WebGLUniformLocation | null;
    time: WebGLUniformLocation | null;
    beautySettings: WebGLUniformLocation | null;
    featureSettings: WebGLUniformLocation | null;
  } = {
    resolution: null,
    time: null,
    beautySettings: null,
    featureSettings: null
  };
  
  // Current beauty settings
  private beautySettings: BeautyEffectSettings = {
    whitening: 0,
    smoothing: 0,
    saturation: 0,
    contrast: 0,
    babyFace: 0,
    selectedFilter: ''
  };

  // Baby face (warp por landmarks MediaPipe)
  private babyFaceProcessor: BabyFaceProcessor | null = null;
  private babyFaceActive = false;
  
  private config: VideoProcessorConfig = {
    width: 1280,
    height: 720,
    fps: 30,
    quality: 'medium'
  };

  constructor(config?: Partial<VideoProcessorConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Inicializar o processador com elemento de vídeo
   */
  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      this.videoElement = videoElement;
      
      // Criar canvas para processamento
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;
      
      // Inicializar WebGL
      const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
      if (!gl) {
        console.error('❌ [VIDEO_PROCESSOR] WebGL não suportado, fallback para Canvas 2D');
        return this.initializeCanvas2D();
      }
      
      this.gl = gl as WebGLRenderingContext;
      
      // Compilar shaders
      if (!this.compileShaders()) {
        console.error('❌ [VIDEO_PROCESSOR] Falha ao compilar shaders');
        return false;
      }
      
      // Configurar buffers
      this.setupBuffers();
      
      // Obter stream original do vídeo
      this.stream = await this.getVideoStream();

      // Garantir que o "Rosto Bebê" seja inicializado se já estiver ativo
      if (this.beautySettings.babyFace && this.beautySettings.babyFace > 0) {
        this.babyFaceActive = true;
        this.ensureBabyFace().then((ok) => {
          if (ok && this.babyFaceProcessor) {
            this.babyFaceProcessor.setIntensity((this.beautySettings.babyFace || 0) / 100);
          }
        });
      }
      
      console.log('✅ [VIDEO_PROCESSOR] Inicializado com WebGL');
      return true;
      
    } catch (error) {
      console.error('❌ [VIDEO_PROCESSOR] Erro na inicialização:', error);
      return false;
    }
  }

  /**
   * Fallback para Canvas 2D se WebGL não disponível
   */
  private async initializeCanvas2D(): Promise<boolean> {
    try {
      const ctx = this.canvas?.getContext('2d');
      if (!ctx) {
        console.error('❌ [VIDEO_PROCESSOR] Canvas 2D não disponível');
        return false;
      }
      
      this.stream = await this.getVideoStream();
      
      console.log('✅ [VIDEO_PROCESSOR] Inicializado com Canvas 2D (fallback)');
      return true;
      
    } catch (error) {
      console.error('❌ [VIDEO_PROCESSOR] Erro no fallback Canvas 2D:', error);
      return false;
    }
  }

  /**
   * Obter stream do elemento de vídeo
   */
  private async getVideoStream(): Promise<MediaStream> {
    if (!this.videoElement) {
      throw new Error('Elemento de vídeo não disponível');
    }

    let sourceStream: MediaStream;

    // Se o vídeo já tem um stream, usar ele
    if (this.videoElement.srcObject instanceof MediaStream) {
      sourceStream = this.videoElement.srcObject;
    } else {
      // Caso contrário, capturar da câmera
      const constraints = {
        video: {
          width: { ideal: this.config.width },
          height: { ideal: this.config.height },
          frameRate: { ideal: this.config.fps }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Aplicar ao elemento de vídeo
      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      sourceStream = stream;
    }

    // ⚠️ Criar um elemento de vídeo DEDICADO (oculto) alimentado pela track de vídeo
    // ORIGINAL. O WebGL/Canvas 2D deve amostrar SEMPRE a câmera original, nunca o
    // elemento de preview compartilhado — porque quando a beleza é ativada a track
    // do preview é substituída pela stream processada (canvas), o que criava um
    // loop de feedback que convergia para tela PRETA ao abrir o painel de beleza.
    const videoTrack = sourceStream.getVideoTracks()[0];
    if (videoTrack) {
      this.cleanupProcessingVideo();
      const processingStream = new MediaStream([videoTrack]);
      const processingVideo = document.createElement('video');
      processingVideo.autoplay = true;
      processingVideo.muted = true;
      processingVideo.playsInline = true;
      processingVideo.setAttribute('playsinline', '');
      processingVideo.srcObject = processingStream;
      await processingVideo.play().catch((e) => {
        console.warn('[VIDEO_PROCESSOR] Não foi possível reproduzir vídeo dedicado de processamento:', e);
      });
      this.processingVideoElement = processingVideo;
    }

    return sourceStream;
  }

  /**
   * Obter a fonte de vídeo a ser amostrada pelo renderer (dedicada ou original)
   */
  private getVideoSource(): CanvasImageSource | null {
    return (this.processingVideoElement || this.videoElement) as CanvasImageSource | null;
  }

  private cleanupProcessingVideo(): void {
    if (this.processingVideoElement) {
      try {
        this.processingVideoElement.srcObject = null;
      } catch { /* ignore */ }
      this.processingVideoElement = null;
    }
  }

  /**
   * Compilar shaders WebGL
   */
  private compileShaders(): boolean {
    if (!this.gl) return false;
    
    // Vertex shader (pass-through)
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
    
    // Fragment shader com efeitos de beleza + detecção facial seletiva
    const fragmentShaderSource = `
      precision mediump float;
      precision mediump int;
      
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec4 u_beautySettings; // x: whitening, y: smoothing, z: saturation, w: contrast
      uniform vec4 u_featureSettings; // x: featureActive, y: edgeStrength, z: preserveLips, w: preserveEyes
      
      varying vec2 v_texCoord;
      
      // --- Funções auxiliares ---
      
      // Conversão RGB para HSV
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      
      // Luminância (percepção de brilho)
      float luminance(vec3 rgb) {
        return dot(rgb, vec3(0.299, 0.587, 0.114));
      }
      
      // --- Detecção de pele (skin probability) ---
      // Usa múltiplas faixas HSV para cobrir todos os tons de pele
      float skinProbability(vec3 rgb, vec3 hsv) {
        // Faixa 1: Tons de pele quentes (mais comuns)
        bool range1 = hsv.x >= 0.0 && hsv.x <= 0.12 && hsv.y >= 0.04 && hsv.y <= 0.72 && hsv.z >= 0.15 && hsv.z <= 0.96;
        // Faixa 2: Tons de pele morenos/escuros (menos saturação, menor luminância)
        bool range2 = hsv.x >= 0.0 && hsv.x <= 0.16 && hsv.y >= 0.02 && hsv.y <= 0.55 && hsv.z >= 0.06 && hsv.z <= 0.82;
        // Faixa 3: Tons de pele claros (baixa saturação)
        bool range3 = hsv.x >= 0.0 && hsv.x <= 0.10 && hsv.y >= 0.01 && hsv.y <= 0.25 && hsv.z >= 0.35 && hsv.z <= 0.99;
        // Faixa 4: Tons avermelhados (rosados, queimados de sol)
        bool range4 = hsv.x >= 0.93 && hsv.x <= 1.0 && hsv.y >= 0.04 && hsv.y <= 0.55 && hsv.z >= 0.15 && hsv.z <= 0.85;
        // Faixa 5: Tons oliva/asiáticos (matiz ligeiramente amarelado)
        bool range5 = hsv.x >= 0.08 && hsv.x <= 0.18 && hsv.y >= 0.03 && hsv.y <= 0.50 && hsv.z >= 0.12 && hsv.z <= 0.90;
        
        float prob = 0.0;
        if (range1) prob = 1.0;
        else if (range5) prob = 0.92;
        else if (range2) prob = 0.85;
        else if (range3) prob = 0.78;
        else if (range4) prob = 0.70;
        
        // Reforço: pele tem mais vermelho que azul
        if (rgb.r > rgb.b * 1.08 && rgb.r > rgb.g * 0.82) {
          prob = mix(prob, 1.0, 0.25);
        } else {
          prob = prob * 0.5;
        }
        
        // Reforço: tons muito verdes não são pele
        if (rgb.g > rgb.r * 0.95 && hsv.x > 0.2 && hsv.x < 0.6) {
          prob = 0.0;
        }
        
        return clamp(prob, 0.0, 1.0);
      }
      
      // --- Detecção de olhos e sobrancelhas ---
      // Olhos: muito escuros, baixa saturação
      float isEyeOrBrow(vec3 hsv) {
        if (u_featureSettings.w < 0.5) return 0.0; // preserveEyes desligado
        // Olhos/sobrancelhas: muito escuros, dessaturados
        if (hsv.z < 0.14 && hsv.y < 0.25) return 1.0;
        // Olhos podem ter brilho (córnea) - detectar pupila muito escura
        if (hsv.z < 0.08 && hsv.y < 0.15) return 1.0;
        return 0.0;
      }
      
      // --- Detecção de lábios ---
      float isLip(vec3 rgb, vec3 hsv) {
        if (u_featureSettings.z < 0.5) return 0.0; // preserveLips desligado
        // Lábios: saturação mais alta, matiz avermelhado
        bool reddish = (hsv.x >= 0.90 || hsv.x <= 0.06);
        float sat = hsv.y;
        float val = hsv.z;
        
        // Lábios têm saturação elevada e valor médio
        if (reddish && sat >= 0.30 && sat <= 0.85 && val >= 0.20 && val <= 0.80) {
          return 1.0;
        }
        // Lábios mais secos/menos pigmentados
        if (reddish && sat >= 0.15 && sat <= 0.85 && val >= 0.35 && val <= 0.80) {
          return 0.6;
        }
        return 0.0;
      }
      
      // --- Detecção de cabelo ---
      float isHair(vec3 hsv) {
        // Cabelo: muito escuro (baixo valor), dessaturado
        if (hsv.z < 0.06 && hsv.y < 0.12) return 1.0;
        // Cabelo castanho
        if (hsv.z < 0.15 && hsv.z >= 0.06 && hsv.y < 0.30 && hsv.x >= 0.0 && hsv.x <= 0.12) return 0.8;
        // Cabelo louro/ruivo mais claro
        if (hsv.y > 0.30 && hsv.z >= 0.15 && hsv.z < 0.35 && hsv.x >= 0.0 && hsv.x <= 0.15) return 0.5;
        return 0.0;
      }
      
      // --- Detecção de bordas (Sobel) ---
      // Preserva contornos de olhos, boca, nariz
      float edgeDetection(vec2 uv, vec2 texelSize) {
        float lum[9];
        lum[0] = luminance(texture2D(u_texture, uv + vec2(-1.0, -1.0) * texelSize).rgb);
        lum[1] = luminance(texture2D(u_texture, uv + vec2(0.0, -1.0) * texelSize).rgb);
        lum[2] = luminance(texture2D(u_texture, uv + vec2(1.0, -1.0) * texelSize).rgb);
        lum[3] = luminance(texture2D(u_texture, uv + vec2(-1.0, 0.0) * texelSize).rgb);
        lum[4] = luminance(texture2D(u_texture, uv + vec2(0.0, 0.0) * texelSize).rgb);
        lum[5] = luminance(texture2D(u_texture, uv + vec2(1.0, 0.0) * texelSize).rgb);
        lum[6] = luminance(texture2D(u_texture, uv + vec2(-1.0, 1.0) * texelSize).rgb);
        lum[7] = luminance(texture2D(u_texture, uv + vec2(0.0, 1.0) * texelSize).rgb);
        lum[8] = luminance(texture2D(u_texture, uv + vec2(1.0, 1.0) * texelSize).rgb);
        // Sobel horizontal
        float gx = lum[6] + 2.0 * lum[7] + lum[8] - (lum[0] + 2.0 * lum[1] + lum[2]);
        // Sobel vertical
        float gy = lum[2] + 2.0 * lum[5] + lum[8] - (lum[0] + 2.0 * lum[3] + lum[6]);
        float magnitude = length(vec2(gx, gy)) * 1.5;
        return clamp(magnitude * u_featureSettings.y, 0.0, 1.0);
      }
      
      // --- Blur Gaussiano com Bilateral Filter ---
      // Preserva bordas enquanto suaviza
      vec3 bilateralBlur(vec2 uv, vec2 texelSize, float radius, vec3 centerColor) {
        vec3 result = vec3(0.0);
        float totalWeight = 0.0;
        float sigmaSpatial = max(radius * 0.5, 1.0);
        float sigmaColor = 0.08;
        float maxDist2 = radius * radius * 4.0;
        
        // Kernel fixo 7x7 para compatibilidade GLSL ES
        for (int x = -3; x <= 3; x++) {
          for (int y = -3; y <= 3; y++) {
            float dx = float(x);
            float dy = float(y);
            float dist2 = dx * dx + dy * dy;
            if (dist2 > maxDist2) continue;
            
            vec2 offset = vec2(dx, dy) * texelSize;
            vec3 sampleColor = texture2D(u_texture, uv + offset).rgb;
            
            // Peso espacial (Gaussiano)
            float spatialWeight = exp(-dist2 / (2.0 * sigmaSpatial * sigmaSpatial));
            // Peso de cor (Bilateral — preserva bordas)
            float colorDist = length(sampleColor - centerColor);
            float colorWeight = exp(-(colorDist * colorDist) / (2.0 * sigmaColor * sigmaColor));
            
            float weight = spatialWeight * colorWeight;
            result += sampleColor * weight;
            totalWeight += weight;
          }
        }
        
        return result / max(totalWeight, 0.001);
      }
      
      void main() {
        vec2 uv = v_texCoord;
        uv.y = 1.0 - uv.y;
        
        vec4 color = texture2D(u_texture, uv);
        vec3 rgb = color.rgb;
        vec3 hsv = rgb2hsv(rgb);
        vec2 texelSize = 1.0 / u_resolution;
        
        // Extrair configurações normalizadas
        float whitening = u_beautySettings.x / 100.0;
        float smoothing = u_beautySettings.y / 100.0;
        float saturationVal = u_beautySettings.z / 100.0;
        float contrastVal = u_beautySettings.w / 200.0;
        
        float featureActive = u_featureSettings.x; // 0=desligado, 1=ligado
        
        // --- 1. Mapa de detecção facial ---
        float skinProb = skinProbability(rgb, hsv);
        float eyeScore = isEyeOrBrow(hsv);
        float lipScore = isLip(rgb, hsv);
        float hairScore = isHair(hsv);
        
        // --- 2. Detecção de bordas nas features ---
        float edgeScore = edgeDetection(uv, texelSize);
        
        // --- 3. Máscara combinada de features a preservar ---
        // Se featureActive=0, não preserva nada (comportamento original)
        float preserveMask = 0.0;
        if (featureActive > 0.5) {
          preserveMask = max(max(eyeScore, lipScore), hairScore);
          preserveMask = max(preserveMask, edgeScore * 0.7);
        }
        
        // Máscara final: só aplica suavização onde é pele E não é feature
        float skinMask = skinProb * (1.0 - preserveMask);
        
        // --- 4. Aplicar efeitos ---
        vec3 result = rgb;
        
        // Branqueamento (whitening) — mais forte na pele, suave nas features
        if (whitening > 0.0) {
          float skinFactor = mix(0.2, 1.0, skinMask);
          vec3 whitened = rgb + (1.0 - rgb) * whitening * 0.45 * skinFactor;
          result = mix(result, whitened, smoothstep(0.0, 0.3, whitening));
        }
        
        // Suavização seletiva (smoothing) — APENAS na pele, preservando features
        if (smoothing > 0.0 && skinMask > 0.01) {
          float blurRadius = smoothing * 2.5;
          vec3 blurred = bilateralBlur(uv, texelSize, blurRadius, rgb);
          
          // Quanto maior o skinMask, mais blur aplica
          float blendAmount = skinMask * smoothing * 0.85;
          result = mix(result, blurred, blendAmount);
        }
        
        // Saturação (ruborizar)
        if (saturationVal != 0.0) {
          float gray = luminance(result);
          float satStrength = 1.0 + saturationVal * 0.5;
          // Protege as features da supersaturação
          float satMask = mix(satStrength, 1.0, preserveMask * 0.75);
          result = mix(vec3(gray), result, satMask);
        }
        
        // Contraste
        if (contrastVal != 0.0) {
          result = (result - 0.5) * (1.0 + contrastVal) + 0.5;
          result = clamp(result, 0.0, 1.0);
        }
        
        gl_FragColor = vec4(result, color.a);
      }
    `;
    
    // Compilar shaders
    const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) {
      return false;
    }
    
    // Criar programa
    this.program = this.gl.createProgram();
    if (!this.program) return false;
    
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('❌ [VIDEO_PROCESSOR] Falha no link do programa:', this.gl.getProgramInfoLog(this.program));
      return false;
    }
    
    // Obter localizações dos uniforms
    this.uniformLocations.resolution = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.uniformLocations.time = this.gl.getUniformLocation(this.program, 'u_time');
    this.uniformLocations.beautySettings = this.gl.getUniformLocation(this.program, 'u_beautySettings');
    this.uniformLocations.featureSettings = this.gl.getUniformLocation(this.program, 'u_featureSettings');
    
    return true;
  }

  /**
   * Compilar shader individual
   */
  private compileShader(source: string, type: number): WebGLShader | null {
    if (!this.gl) return null;
    
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('❌ [VIDEO_PROCESSOR] Erro no shader:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  /**
   * Configurar buffers WebGL
   */
  private setupBuffers(): void {
    if (!this.gl || !this.program) return;
    
    // Posição (quad fullscreen)
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
    ]);
    
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    
    // Coordenadas de textura
    const texCoords = new Float32Array([
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      1.0, 1.0,
    ]);
    
    this.textureBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
    
    // Criar textura de vídeo
    this.videoTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.videoTexture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  }

  /**
   * Iniciar processamento de vídeo
   */
  startProcessing(): MediaStream {
    if (this.isProcessing) {
      return this.processedStream!;
    }
    
    this.isProcessing = true;
    
    if (this.gl) {
      this.startWebGLProcessing();
    } else {
      this.startCanvas2DProcessing();
    }
    
    // Criar stream processado do canvas
    this.processedStream = this.canvas!.captureStream(this.config.fps);
    
    // Adicionar áudio do stream original
    if (this.stream) {
      const audioTracks = this.stream.getAudioTracks();
      audioTracks.forEach(track => {
        this.processedStream!.addTrack(track);
      });
    }
    
    console.log('✅ [VIDEO_PROCESSOR] Processamento iniciado');
    return this.processedStream;
  }

  /**
   * Processamento com WebGL
   */
  private startWebGLProcessing(): void {
    const source = this.getVideoSource();
    if (!this.gl || !this.canvas || !source || !this.program || !this.videoTexture || !this.positionBuffer || !this.textureBuffer) return;
    
    const gl = this.gl;
    const canvas = this.canvas;
    const program = this.program;
    const videoTexture = this.videoTexture;
    const positionBuffer = this.positionBuffer;
    const textureBuffer = this.textureBuffer;
    const uniformLocs = this.uniformLocations;
    const uRes = uniformLocs.resolution;
    const uTime = uniformLocs.time;
    const uBeauty = uniformLocs.beautySettings;
    
    const render = () => {
      if (!this.isProcessing) return;
      
      // Limpar canvas
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      // Usar programa
      gl.useProgram(program);
      
      // Atualizar textura do vídeo (com warp de "Rosto Bebê" se ativo)
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      let imageSource: TexImageSource = this.getVideoSource() as TexImageSource;
      if (!imageSource) {
        this.animationId = requestAnimationFrame(render);
        return;
      }
      if (this.babyFaceActive && this.babyFaceProcessor && this.babyFaceProcessor.isReady()) {
        const warped = this.babyFaceProcessor.render();
        if (warped) imageSource = warped;
      }
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageSource);
      } catch (e) {
        // Textura ainda não disponível (vídeo sem frame) — tentar no próximo frame
        this.animationId = requestAnimationFrame(render);
        return;
      }
      
      // Configurar uniforms
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, performance.now() / 1000);
      if (uBeauty) {
        gl.uniform4f(
          uBeauty,
          this.beautySettings.whitening,
          this.beautySettings.smoothing,
          this.beautySettings.saturation,
          this.beautySettings.contrast
        );
      }
      
      const uFeature = uniformLocs.featureSettings;
      if (uFeature) {
        // x: featureActive (1.0 = ligado), y: edgeStrength (1.0 padrão), z: preserveLips (1.0 = ligado), w: preserveEyes (1.0 = ligado)
        gl.uniform4f(uFeature, 1.0, 1.0, 1.0, 1.0);
      }
      
      // Configurar atributos
      const positionLocation = gl.getAttribLocation(program, 'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      
      const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
      gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
      
      // Desenhar
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      // Continuar loop
      this.animationId = requestAnimationFrame(render);
    };
    
    render();
  }

  /**
   * Fallback Canvas 2D processing
   */
  private startCanvas2DProcessing(): void {
    const source = this.getVideoSource();
    if (!this.canvas || !source) return;
    
    const canvas = this.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      if (!this.isProcessing) return;

      // Com "Rosto Bebê" ativo, usa o frame warpeado como base
      let imageSource: CanvasImageSource | null = this.getVideoSource();
      if (!imageSource) {
        this.animationId = requestAnimationFrame(render);
        return;
      }
      if (this.babyFaceActive && this.babyFaceProcessor && this.babyFaceProcessor.isReady()) {
        const warped = this.babyFaceProcessor.render();
        if (warped) imageSource = warped;
      }

      // Desenhar vídeo no canvas
      ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
      
      // Aplicar filtros CSS básicos como fallback
      ctx.filter = this.getCSSFilterString();
      
      // Redesenhar com filtro
      ctx.drawImage(canvas, 0, 0);
      
      this.animationId = requestAnimationFrame(render);
    };
    
    render();
  }

  /**
   * Obter string de filtros CSS para fallback
   */
  private getCSSFilterString(): string {
    const filters = [];
    
    if (this.beautySettings.whitening > 0) {
      filters.push(`brightness(${1 + this.beautySettings.whitening / 100})`);
    }
    
    if (this.beautySettings.smoothing > 0) {
      filters.push(`blur(${Math.min(this.beautySettings.smoothing / 50, 2)}px)`);
    }
    
    if (this.beautySettings.saturation > 0) {
      filters.push(`saturate(${1 + this.beautySettings.saturation / 100})`);
    }
    
    if (this.beautySettings.contrast > 0) {
      filters.push(`contrast(${1 + this.beautySettings.contrast / 200})`);
    }
    
    return filters.join(' ') || 'none';
  }

  /**
   * Atualizar configurações de beleza
   */
  updateBeautySettings(settings: Partial<BeautyEffectSettings>): void {
    this.beautySettings = { ...this.beautySettings, ...settings };
    this.syncNativeBeautySettings();

    const babyFace = this.beautySettings.babyFace || 0;
    this.babyFaceActive = babyFace > 0;
    if (this.babyFaceActive) {
      this.ensureBabyFace().then((ok) => {
        if (ok && this.babyFaceProcessor) {
          this.babyFaceProcessor.setIntensity(babyFace / 100);
        }
      });
    } else if (this.babyFaceProcessor) {
      this.babyFaceProcessor.setIntensity(0);
    }
  }

  /**
   * Inicializar (lazy) o processador de "Rosto Bebê" com MediaPipe
   */
  private async ensureBabyFace(): Promise<boolean> {
    if (this.babyFaceProcessor) {
      return this.babyFaceProcessor.isReady() || this.babyFaceProcessor.initialize(this.videoElement!);
    }
    if (!this.videoElement) return false;
    this.babyFaceProcessor = new BabyFaceProcessor();
    return this.babyFaceProcessor.initialize(this.videoElement);
  }

  private syncNativeBeautySettings(): void {
    const bridge = typeof window !== 'undefined' ? (window as any).Android : undefined;
    if (!bridge?.applyBeautySettings) return;

    bridge.applyBeautySettings(
      this.beautySettings.whitening || 0,
      this.beautySettings.smoothing || 0,
      this.beautySettings.saturation || 0,
      this.beautySettings.contrast || 0,
      this.beautySettings.selectedFilter || ''
    );
  }

  /**
   * Obter stream processado
   */
  getProcessedStream(): MediaStream | null {
    return this.processedStream;
  }

  /**
   * Parar processamento
   */
  stopProcessing(): void {
    this.isProcessing = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.processedStream) {
      this.processedStream.getTracks().forEach(track => track.stop());
      this.processedStream = null;
    }
    
    if (this.babyFaceProcessor) {
      this.babyFaceProcessor.setIntensity(0);
    }
    
    console.log('⏹️ [VIDEO_PROCESSOR] Processamento parado');
  }

  /**
   * Limpar recursos
   */
  destroy(): void {
    this.stopProcessing();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Limpar recursos WebGL
    if (this.gl) {
      if (this.program) {
        this.gl.deleteProgram(this.program);
        this.program = null;
      }
      
      if (this.positionBuffer) {
        this.gl.deleteBuffer(this.positionBuffer);
        this.positionBuffer = null;
      }
      
      if (this.textureBuffer) {
        this.gl.deleteBuffer(this.textureBuffer);
        this.textureBuffer = null;
      }
      
      if (this.videoTexture) {
        this.gl.deleteTexture(this.videoTexture);
        this.videoTexture = null;
      }
    }
    
    this.videoElement = null;
    this.canvas = null;
    this.gl = null;
    
    if (this.babyFaceProcessor) {
      this.babyFaceProcessor.destroy();
      this.babyFaceProcessor = null;
    }
    this.babyFaceActive = false;
    
    this.cleanupProcessingVideo();
    
    console.log('🗑️ [VIDEO_PROCESSOR] Recursos liberados');
  }
}

// Instância global
export const videoProcessor = new VideoProcessor();

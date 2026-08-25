// Serviço de processamento de vídeo em tempo real com efeitos de beleza
// Implementação completa com WebGL para performance via GPU

import { BabyFaceProcessor } from './BabyFaceProcessor';
import { FaceSkinMask } from './FaceSkinMask';
import { getVideoConstraints } from './cameraService';

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
  teethWhitening?: number;  // Boca — Clarear dentes (0-100)
  lipFill?: number;         // Boca — Preenchimento labial (0-100)
  lipAugment?: number;      // Boca — Aumentar lábios (0-100)
  smileAdjust?: number;     // Boca — Ajuste de sorriso (0-100)
  browThickness?: number;   // Sobrancelha — Espessura (0-100)
  browCurve?: number;       // Sobrancelha — Curvatura (0-100)
  browDefinition?: number;  // Sobrancelha — Definição (0-100)
  wrinkleSmoothing?: number;// Rejuvenescimento — Suavizar rugas (0-100)
  darkCircle?: number;      // Rejuvenescimento — Clarear olheiras (0-100)
  noseRefine?: number;      // Modelagem — Refinar nariz (0-100, mesh MediaPipe)
  jawChin?: number;         // Modelagem — Mandíbula/queixo V-line (0-100, mesh)
  eyeRefine?: number;       // Modelagem — Refinamento de olhos (0-100, mesh)
  browColor?: string;       // Sobrancelha — Cor (hex '#4a2c17', mesh)
  browColorStrength?: number; // Sobrancelha — Intensidade da cor (0-100, mesh)
  acneRemoval?: number;     // Rejuvenescimento — Remover manchas/acne (0-100)
  shineReduction?: number;  // Rejuvenescimento — Reduzir brilho/matte (0-100)
  whiteBalance?: number;    // Balanço de branco ~5400K (0-100) — tira o tom amarelo
  sharpness?: number;       // Nitidez (0-100) — realça detalhes/clareza (Tencent: Sharpness 80)
  faceVolume3D?: number;    // Efeito 3D (0-100) — volume/modelagem de luz no rosto, aparência natural mais jovem
  noiseReduction?: number;  // Limpar Chiado (0-100) — reduz ruído/grão da câmera preservando bordas
  selectedFilter?: string;
}

// 🎨 FILTRO 2D PADRÃO aplicado JÁ NA ABERTURA da live (estilo Bigo/ti.live):
// imagem clara e brilhante, rosto suave e natural, sem o tom amarelo feio.
// Balanço de branco em ~5400K + brilho/contraste sutis.
// Ao entrar na live o usuário JÁ PEGA a imagem limpa, cor viva e nitidez total.
export const DEFAULT_BEAUTY_SETTINGS: BeautyEffectSettings = {
    whitening: 38,
    smoothing: 36,
    saturation: 30,
    contrast: 16,
    whiteBalance: 42,
    // 🍼 Rosto Bebê mais presente (era 32 — usuário reportou efeito fraco/invisível).
    babyFace: 38,
    teethWhitening: 22,
    lipFill: 0,
    lipAugment: 0,
    smileAdjust: 0,
    browThickness: 0,
    browCurve: 0,
    browDefinition: 0,
    wrinkleSmoothing: 42,
    darkCircle: 32,
    noseRefine: 0,
    jawChin: 0,
    eyeRefine: 0,
    browColor: '',
    browColorStrength: 0,
    // 🧼 Remoção de manchas mais forte (era 55 — manchas do rosto ainda visíveis).
    acneRemoval: 68,
    shineReduction: 25,
  // 🔍 Nitidez equilibrada (Tencent Sharpness ~65) — alta demais (80) amplifica
  // o ruído do sensor e vira CHIADO na imagem; baixa demais deixa embaçado.
  // Combinada com o smoothing (34) que segura o ruído, a imagem fica limpa e
  // nítida ao mesmo tempo. Efeito 3D mantém o volume facial (aparência jovem).
  sharpness: 65,
  faceVolume3D: 48,
  // 🧹 Limpar Chiado — redução de ruído bilateral ANTES dos efeitos: remove o
  // grão da câmera (chiado de sensor/ISO) da imagem INTEIRA preservando bordas.
  // ✅ o que tira aquele aspecto feio de "TV velha" sem embaçar o rosto.
  // 60 = limpeza mais agressiva para a live ficar lisa mesmo com pouca luz.
  noiseReduction: 60,
  selectedFilter: '',
};

export class VideoProcessor {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private stream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  private processingVideoElement: HTMLVideoElement | null = null;

  // 📷 Stream ORIGINAL da câmera (cru). Guardado para o preview poder exibir o
  // stream processado (canvas WebGL) sem feedback loop: ao reinicializar, o
  // processador amostra SEMPRE este stream cru, nunca o canvas processado.
  private rawSourceStream: MediaStream | null = null;
  
  private animationId: number | null = null;
  private isProcessing = false;
  // ⏱️ Heartbeat do loop de render: timestamp do último frame desenhado.
  // Usado para SABER se o stream processado está produzindo frames de verdade
  // (ex.: sala de transmissão só publica depois do filtro estar fluindo).
  private lastRenderAt = 0;

  /** O pipeline está rodando E produziu frame nos últimos 600ms? */
  isFramesFlowing(): boolean {
    return !!this.isProcessing && performance.now() - this.lastRenderAt < 600;
  }
  
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
    beautySettings2: WebGLUniformLocation | null;
    beautySettings3: WebGLUniformLocation | null;
    beautySettings4: WebGLUniformLocation | null;
    featureSettings: WebGLUniformLocation | null;
    faceMask: WebGLUniformLocation | null;
    faceMaskActive: WebGLUniformLocation | null;
  } = {
    resolution: null,
    time: null,
    beautySettings: null,
    beautySettings2: null,
    beautySettings3: null,
    beautySettings4: null,
    featureSettings: null,
    faceMask: null,
    faceMaskActive: null
  };
  
  // Current beauty settings
  private beautySettings: BeautyEffectSettings = {
    whitening: 0,
    smoothing: 0,
    saturation: 0,
    contrast: 0,
    babyFace: 0,
    teethWhitening: 0,
    lipFill: 0,
    lipAugment: 0,
    smileAdjust: 0,    browThickness: 0,
    browCurve: 0,
    browDefinition: 0,
    wrinkleSmoothing: 0,
    darkCircle: 0,
    noseRefine: 0,
    jawChin: 0,
    eyeRefine: 0,
    browColor: '',
    browColorStrength: 0,
    acneRemoval: 0,
    shineReduction: 0,
    whiteBalance: 0,
    sharpness: 0,
    faceVolume3D: 0,
    noiseReduction: 0,
    selectedFilter: ''
  };

  // Baby face (warp por landmarks MediaPipe)
  private babyFaceProcessor: BabyFaceProcessor | null = null;
  private meshActive = false;

  // 🧑 Máscara de PELE do rosto (MediaPipe) — restringe suavização/clareamento
  // ao oval do rosto, preservando olhos, sobrancelhas, boca e fundo.
  private faceSkinMask: FaceSkinMask | null = null;
  private maskTexture: WebGLTexture | null = null;
  
  private config: VideoProcessorConfig = {
    width: 1920,
    height: 1080,
    fps: 30,
    quality: 'high'
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
      // 🔁 Se o pipeline já está ativo para a MESMA câmera (mesmo track id),
      // NÃO recriar canvas/shader/stream — evita double-init (GoLive abre o
      // filtro padrão e o painel chama de novo ao abrir). Se o srcObject mudou
      // (troca de câmera), recria normalmente.
      if (this.gl && this.processedStream) {
        const curTrack = this.videoElement?.srcObject instanceof MediaStream
          ? this.videoElement.srcObject.getVideoTracks()[0]?.id
          : undefined;
        const newTrack = videoElement.srcObject instanceof MediaStream
          ? videoElement.srcObject.getVideoTracks()[0]?.id
          : undefined;
        if (curTrack !== undefined && curTrack === newTrack) {
          console.log('✅ [VIDEO_PROCESSOR] Já inicializado para esta câmera — reutilizando pipeline');
          return true;
        }
      }

      this.videoElement = videoElement;
      
      // Criar canvas para processamento
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;
      
      // Inicializar WebGL — alpha:false é OBRIGATÓRIO para o captureStream() do
      // canvas não sair com TOM AMARELADO/esverdeado no WebRTC: canvas com canal
      // alpha deixa o navegador aplicar uma composição/conversão de cor extra na
      // track capturada (mismatch BT.601/BT.709). Com alpha:false o canvas é
      // opaco e a cor chega intacta ao encoder.
      const glAttribs: WebGLContextAttributes = { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false };
      const gl = this.canvas.getContext('webgl', glAttribs) || this.canvas.getContext('experimental-webgl', glAttribs);
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

      // 🧑 Máscara de pele do rosto: anexa ao vídeo DEDICADO de processamento e
      // pré-carrega o Face Landmarker em paralelo (não bloqueia o pipeline).
      this.initFaceSkinMask();

      // Garantir que o processamento por malha facial (Rosto Bebê / lábios / sobrancelha) seja iniciado se já estiver ativo
      if (this.meshActive) {
        this.ensureBabyFace().then((ok) => {
          if (ok && this.babyFaceProcessor) {
            this.syncMeshParams();
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
   * 🧑 Inicializa (lazy) a máscara de pele via MediaPipe. Amostra SEMPRE o vídeo
   * dedicado de processamento (câmera crua) — nunca o preview, que pode exibir
   * o canvas processado (feedback loop). Falha é silenciosa: sem máscara o
   * shader usa só detecção por cor, como antes.
   */
  private initFaceSkinMask(): void {
    try {
      if (!this.faceSkinMask) {
        this.faceSkinMask = new FaceSkinMask();
      }
      const sampleVideo = this.processingVideoElement || this.videoElement;
      if (sampleVideo) {
        this.faceSkinMask.attach(sampleVideo);
      }
      this.faceSkinMask.preload().then((ok) => {
        if (ok) console.log('✅ [VIDEO_PROCESSOR] Máscara de pele facial ativa (suavização só no rosto)');
      });
    } catch (e) {
      console.warn('⚠️ [VIDEO_PROCESSOR] Máscara facial não iniciada:', e);
    }
  }

  /**
   * Fallback para Canvas 2D se WebGL não disponível
   */
  private async initializeCanvas2D(): Promise<boolean> {
    try {
      // alpha:false — mesmo motivo do WebGL: captureStream de canvas opaco
      // evita o tom amarelado no WebRTC.
      const ctx = this.canvas?.getContext('2d', { alpha: false });
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

    let sourceStream: MediaStream | null = null;

    // 🚫 NUNCA amostrar o canvas processado como fonte (feedback loop). Se o
    // preview já mostra o stream processado, usar o stream ORIGINAL guardado.
    if (this.rawSourceStream) {
      const t = this.rawSourceStream.getVideoTracks()[0];
      if (t && t.readyState === 'live') {
        sourceStream = this.rawSourceStream;
      }
    }

    // Se o vídeo tem um stream que NÃO é o nosso canvas processado, usar ele
    if (!sourceStream && this.videoElement.srcObject instanceof MediaStream) {
      const soTrack = this.videoElement.srcObject.getVideoTracks()[0];
      const procTrack = this.processedStream?.getVideoTracks()[0] ?? null;
      const isSelfCanvas = !!soTrack && !!procTrack && soTrack.id === procTrack.id;
      if (!isSelfCanvas) {
        sourceStream = this.videoElement.srcObject;
      }
    }

    // Caso contrário, capturar da câmera
    if (!sourceStream) {
      // 📷 Resolução na orientação do aparelho (portrait no celular, 16:9 no
      // desktop) — sem min/max que forcassem landscape e distorcessem o preview.
      const tier1 = {
        video: getVideoConstraints('user'),
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      };
      const tier2 = {
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      };

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(tier1);
      } catch (err1) {
        console.warn('[VIDEO_PROCESSOR] Constraints HD falharam, tentando sem restrição:', err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia(tier2);
        } catch (err2) {
          console.error('[VIDEO_PROCESSOR] Sem acesso à câmera:', err2);
        }
      }
      if (!stream) {
        throw new Error('Sem stream de câmera disponível');
      }

      // Aplicar ao elemento de vídeo
      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      sourceStream = stream;
    }

    // Guardar o stream cru para futuras reinicializações (troca de câmera)
    this.rawSourceStream = sourceStream;

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
      // 🚨 OBRIGATÓRIO anexar ao DOM: um <video> FORA do DOM não decodifica
      // frames em vários navegadores/WebViews → o texImage2D do WebGL subia uma
      // textura VAZIA e o canvas processado ficava PRETO na transmissão. Fica
      // offscreen (posição fora da viewport), sem aparecer na tela.
      processingVideo.style.position = 'fixed';
      processingVideo.style.left = '-2000px';
      processingVideo.style.top = '0';
      processingVideo.style.width = '2px';
      processingVideo.style.height = '2px';
      processingVideo.style.opacity = '0';
      processingVideo.style.pointerEvents = 'none';
      processingVideo.setAttribute('aria-hidden', 'true');
      document.body.appendChild(processingVideo);
      processingVideo.srcObject = processingStream;
      await processingVideo.play().catch((e) => {
        console.warn('[VIDEO_PROCESSOR] Não foi possível reproduzir vídeo dedicado de processamento:', e);
      });
      this.processingVideoElement = processingVideo;

      // 📏 Dimensionar o canvas para a resolução real da fonte ANTES do
      // captureStream(). O canvas.captureStream() fixa a track na resolução do
      // canvas NA HORA da captura; se o canvas ainda estiver 1280x720 (padrão) e
      // só depois for redimensionado, várias WebViews mantêm a track 16:9 e o
      // preview vira um ZOOM pesado do rosto em telas retrato ("colado no rosto").
      await this.waitForVideoSize(processingVideo);
      // 🚨 Em várias WebViews Android o decoder amostra frames na resolução do
      // LAYOUT do <video> — com width/height 2px o frame era decodificado
      // minúsculo e upscalado no texImage2D (imagem borrada/granulada, "TV
      // velha"). Forçando o elemento ao tamanho NATIVO (videoWidth/videoHeight)
      // o frame sai na resolução real da câmera. (Mesmo workaround do vap/vapVideo.)
      processingVideo.style.width = `${processingVideo.videoWidth || 2}px`;
      processingVideo.style.height = `${processingVideo.videoHeight || 2}px`;
      this.syncCanvasToSource();
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
        this.processingVideoElement.remove();
      } catch { /* ignore */ }
      this.processingVideoElement = null;
    }
  }

  /**
   * Aguarda o elemento de vídeo de processamento reportar resolução nativa
   * (videoWidth/videoHeight > 0). Algumas WebViews só decodificam o primeiro
   * frame depois do play(); capturar o canvas antes disso resultaria em track
   * com dimensões erradas (zoom no preview).
   */
  private waitForVideoSize(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve) => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve();
        return;
      }
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onTimeout = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('loadeddata', onLoaded);
        clearTimeout(timeout);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('loadeddata', onLoaded);
      const timeout = setTimeout(onTimeout, 4000);
    });
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
      uniform vec4 u_beautySettings2; // x: teethWhitening, y: wrinkleSmoothing, z: darkCircle, w: browDefinition
      uniform vec4 u_beautySettings3; // x: acneRemoval, y: shineReduction, z: sharpness, w: faceVolume3D
      uniform vec4 u_beautySettings4; // x: whiteBalance (balanço de branco ~5400K)
      uniform vec4 u_featureSettings; // x: featureActive, y: edgeStrength, z: preserveLips, w: preserveEyes
      uniform sampler2D u_faceMask; // máscara de pele do rosto (MediaPipe): r=1 pele, r=0 preservado
      uniform float u_faceMaskActive; // 1.0 = máscara disponível (rosto detectado)
      
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
      
      // --- Detecção de dentes (para clareamento) ---
      // Dentes: alta luminância, baixa saturação
      float isTooth(vec3 rgb, vec3 hsv) {
        float lum = luminance(rgb);
        if (hsv.y < 0.28 && lum > 0.60 && lum < 0.98) return 1.0;
        if (hsv.y < 0.40 && lum > 0.72 && lum < 0.98) return 0.55;
        return 0.0;
      }
      
      // --- Detecção de detalhe fino (rugas) ---
      // Compara luminância dos vizinhos imediatos; rugas geram detalhe sem borda forte
      float localDetail(vec2 uv, vec2 texelSize) {
        float l = luminance(texture2D(u_texture, uv + vec2(-1.0, 0.0) * texelSize).rgb);
        float r = luminance(texture2D(u_texture, uv + vec2(1.0, 0.0) * texelSize).rgb);
        float u2 = luminance(texture2D(u_texture, uv + vec2(0.0, -1.0) * texelSize).rgb);
        float d = luminance(texture2D(u_texture, uv + vec2(0.0, 1.0) * texelSize).rgb);
        return abs(l - r) + abs(u2 - d);
      }
      
      // --- Blur Gaussiano leve (para nitidez / unsharp mask) ---
      vec3 gaussianBlurLight(vec2 uv, vec2 texelSize) {
        vec3 sum = vec3(0.0);
        float weights[9];
        weights[0] = 1.0; weights[1] = 2.0; weights[2] = 1.0;
        weights[3] = 2.0; weights[4] = 4.0; weights[5] = 2.0;
        weights[6] = 1.0; weights[7] = 2.0; weights[8] = 1.0;
        float total = 16.0;
        int i = 0;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            float w = weights[i];
            sum += texture2D(u_texture, uv + vec2(float(x), float(y)) * texelSize).rgb * w;
            i++;
          }
        }
        return sum / total;
      }
      
      // --- Nitidez (unsharp mask) estilo Tencent Sharpness ---
      // Aumenta o contraste local de MICRO-detalhe (poros, fios, contornos finos)
      // sem estourar bordas fortes. Aplica no resultado final, ponderado pela pele.
      // 🧹 ANTI-CHUVISCO: em áreas PLANAS o "detalhe" é só grão do sensor — a
      // nitidez NÃO amplia ruído (textureGate), só textura/contorno reais.
      // Resultado: imagem limpa de HD sem cara de plástico.
      vec3 applySharpness(vec3 rgb, vec2 uv, vec2 texelSize, float strength, float skinMask) {
        vec3 blurred = gaussianBlurLight(uv, texelSize);
        vec3 detail = rgb - blurred;
        float detailMag = length(detail);
        float textureGate = smoothstep(0.008, 0.055, detailMag);
        // Escala o detalhe: forte na pele, mais contido em features/bordas fortes
        float featureFactor = 1.0 - edgeDetection(uv, texelSize) * 0.45;
        float amount = strength * 0.45 * mix(1.0, 1.25, skinMask) * featureFactor * textureGate;
        return clamp(rgb + detail * amount, 0.0, 1.0);
      }
      
      // --- Efeito 3D / volume facial (estilo Tencent 3D) ---
      // Modela a LUZ do rosto: eleva sutilmente a luminância das áreas centrais
      // iluminadas e dá "profundidade" ao contorno, deixando a aparência mais
      // jovem e com volume, sem achatar a imagem.
      vec3 applyFaceVolume3D(vec3 rgb, vec2 uv, vec2 texelSize, float strength, float skinMask) {
        // Base suave (blur maior simula o "plano de luz" do rosto)
        vec3 blurred = gaussianBlurLight(uv, texelSize);
        // Quanto mais iluminado em relação ao entorno, mais "sobe" (volume)
        float lum = luminance(rgb);
        float base = luminance(blurred);
        float lightDiff = clamp((lum - base) / 0.18, 0.0, 1.0);
        // Iluminação mais quente nos tons altos (aparência jovem/saudável)
        vec3 warm = vec3(1.02, 0.99, 0.97);
        // Combina: elevação de luz + suave modelagem do contorno
        vec3 result = rgb;
        float vol = strength * 0.30 * skinMask;
        result = result + vec3(lightDiff) * warm * vol * 0.5;
        // Profundidade no contorno (sombras suaves mais definidas)
        float shade = clamp(0.5 - base * 1.1, 0.0, 1.0);
        result = mix(result, result * 0.96 + vec3(0.012, 0.008, 0.005), shade * vol * 0.4);
        return clamp(result, 0.0, 1.0);
      }
      
      // --- Detecção de manchas/acne (separação de frequência) ---
      // Manchas: pequenas áreas de PELE mais escuras ou avermelhadas que o
      // ENTORNO imediato (limiar RELATIVO — funciona em qualquer tom de pele).
      float spotScore(vec3 rgb, vec3 hsv, float skinProb, float eyeScore, float lipScore, float hairScore, vec2 uv, vec2 texelSize) {
        float lum = luminance(rgb);
        // Luminância/cor média da vizinhança imediata (raio 2 texels)
        float localLum = 0.0;
        float localR = 0.0;
        int n = 0;
        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
            if (x == 0 && y == 0) continue;
            vec2 off = uv + vec2(float(x), float(y)) * texelSize;
            vec3 s = texture2D(u_texture, off).rgb;
            localLum += luminance(s);
            localR += s.r;
            n++;
          }
        }
        localLum /= float(n);
        localR /= float(n);
        // Escura RELATIVA ao entorno (a mancha é mais escura que a pele ao redor)
        float darkSpot = clamp((localLum - lum) / 0.15, 0.0, 1.0);
        // Avermelhada RELATIVA ao entorno (acne inflamada)
        float redSpot = clamp((rgb.r - localR - 0.08) / 0.15, 0.0, 1.0) * step(0.10, rgb.g);
        float score = max(darkSpot * 0.85, redSpot) * skinProb;
        // Exclui sombras de contorno do rosto (borda forte) e features
        score *= (1.0 - eyeScore) * (1.0 - lipScore) * (1.0 - hairScore);
        // Exclui pixels quase pretos (sombra real, não mancha)
        score *= step(0.03, lum);
        return clamp(score, 0.0, 1.0);
      }
      
      // --- Cor média da pele ao redor (baixa frequência) ---      // Soma um anel ao redor do pixel ponderado pela probabilidade de ser pele;
      // substitui o pixel da mancha pela pele do entorno (clone-style Tencent).
      vec3 skinLocalAverage(vec2 uv, vec2 texelSize, float radius) {
        vec3 sum = vec3(0.0);
        float weightSum = 0.0;
        for (int i = 0; i < 8; i++) {
          float ang = float(i) * 0.7853982; // 45° em radianos
          vec2 off = uv + vec2(cos(ang), sin(ang)) * radius * texelSize;
          vec3 s = texture2D(u_texture, off).rgb;
          vec3 sh = rgb2hsv(s);
          float w = skinProbability(s, sh);
          sum += s * w;
          weightSum += w;
        }
        if (weightSum < 0.01) return texture2D(u_texture, uv).rgb;
        return sum / weightSum;
      }

      // --- Limpar Chiado (redução de ruído bilateral, preserva bordas) ---
      // Remove o grão/chiado do SENSOR da câmera da imagem INTEIRA (não só da
      // pele): média ponderada dos vizinhos onde pesos caem com a diferença de
      // luminância — bordas fortes (contornos, olhos) quase não mudam, ruído
      // homogêneo é suavizado. Roda ANTES dos demais efeitos para a nitidez e a
      // saturação não amplificarem o grão no final.
      vec3 applyDenoise(vec3 rgb, vec2 uv, vec2 texelSize, float strength) {
        float radius = 1.0 + strength * 1.5;
        float sigmaL = 0.10 + strength * 0.32;
        vec3 sum = rgb;
        float wsum = 1.0;
        float axisW = 0.85;
        float diagW = 0.55;
        // Anel duplo (8 vizinhos próximos + 8 a 2x distância): remove grão
        // digital em área maior mantendo o filtro bilateral (bordas intactas).
        for (int i = 0; i < 16; i++) {
          vec2 dir;
          float w;
          if (i == 0)       { dir = vec2(1.0, 0.0);  w = axisW; }
          else if (i == 1)  { dir = vec2(-1.0, 0.0); w = axisW; }
          else if (i == 2)  { dir = vec2(0.0, 1.0);  w = axisW; }
          else if (i == 3)  { dir = vec2(0.0, -1.0); w = axisW; }
          else if (i == 4)  { dir = vec2(1.0, 1.0);  w = diagW; }
          else if (i == 5)  { dir = vec2(-1.0, -1.0); w = diagW; }
          else if (i == 6)  { dir = vec2(1.0, -1.0); w = diagW; }
          else if (i == 7)  { dir = vec2(-1.0, 1.0); w = diagW; }
          else if (i == 8)  { dir = vec2(2.0, 0.0);  w = axisW * 0.6; }
          else if (i == 9)  { dir = vec2(-2.0, 0.0); w = axisW * 0.6; }
          else if (i == 10) { dir = vec2(0.0, 2.0);  w = axisW * 0.6; }
          else if (i == 11) { dir = vec2(0.0, -2.0); w = axisW * 0.6; }
          else if (i == 12) { dir = vec2(2.0, 2.0);  w = diagW * 0.6; }
          else if (i == 13) { dir = vec2(-2.0, -2.0); w = diagW * 0.6; }
          else if (i == 14) { dir = vec2(2.0, -2.0); w = diagW * 0.6; }
          else              { dir = vec2(-2.0, 2.0); w = diagW * 0.6; }
          vec3 nb = texture2D(u_texture, uv + dir * radius * texelSize).rgb;
          float ldiff = abs(luminance(nb) - luminance(rgb));
          float wI = exp(-ldiff / max(sigmaL, 0.01));
          sum += nb * w * wI;
          wsum += w * wI;
        }
        return sum / wsum;
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
        
        float teethWhitening = u_beautySettings2.x / 100.0;
        float wrinkleSmoothing = u_beautySettings2.y / 100.0;
        float darkCircle = u_beautySettings2.z / 100.0;
        float browDefinition = u_beautySettings2.w / 100.0;
        
        float acneRemoval = u_beautySettings3.x / 100.0;
        float shineReduction = u_beautySettings3.y / 100.0;
        float sharpness = u_beautySettings3.z / 100.0;
        float faceVolume3D = u_beautySettings3.w / 100.0;
        float whiteBalance = u_beautySettings4.x / 100.0;
        float noiseReduction = u_beautySettings4.y / 100.0;
        
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

        // 🧑 Máscara de PELE do rosto (MediaPipe Face Landmarker): branco=pele
        // dentro do oval do rosto, preto=olhos/sobrancelhas/boca/fundo. Ativa,
        // a suavização/clareamento passam a valer SÓ no rosto — parede bege,
        // madeira e roupa clara deixam de receber blur de pele.
        if (u_faceMaskActive > 0.5) {
          float m = texture2D(u_faceMask, uv).r;
          float fm = smoothstep(0.10, 0.70, m);
          skinMask = skinProb * fm;
        }
        
        // --- 4. Aplicar efeitos ---
        vec3 result = rgb;
        
        // 🧹 Limpar Chiado — primeiro efeito (imagem crua ainda SEM nitidez/
        // saturação para não amplificar o grão). Limpa a imagem INTEIRA.
        if (noiseReduction > 0.0) {
          result = applyDenoise(result, uv, texelSize, noiseReduction);
        }
        
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
        
        // Clareamento de dentes — pixels claros e dessaturados (dentes)
        if (teethWhitening > 0.0) {
          float toothScore = isTooth(result, rgb2hsv(result));
          if (toothScore > 0.0) {
            vec3 boost = (1.0 - result) * teethWhitening * 0.6 * toothScore;
            result += boost;
            float gray = luminance(result);
            result = mix(result, vec3(gray), teethWhitening * 0.25 * toothScore);
            result = clamp(result, 0.0, 1.0);
          }
        }
        
        // Suavização de rugas — blur extra onde há detalhe fino na pele
        if (wrinkleSmoothing > 0.0 && skinMask > 0.01) {
          float detail = localDetail(uv, texelSize);
          // Rugas: detalhe médio (não borda forte de contorno)
          float wrinkleMask = skinMask * detail * (1.0 - step(0.55, edgeScore)) * (1.0 - eyeScore) * (1.0 - lipScore);
          if (wrinkleMask > 0.02) {
            float blurRadius = wrinkleSmoothing * 1.8;
            vec3 blurred = bilateralBlur(uv, texelSize, blurRadius, result);
            float blend = wrinkleMask * wrinkleSmoothing * 0.9;
            result = mix(result, blurred, blend);
          }
        }
        
        // Clareamento de olheiras — eleva a luminância de sombras escuras da pele
        if (darkCircle > 0.0) {
          float lum = luminance(result);
          float shadowFactor = clamp((0.56 - lum) / 0.32, 0.0, 1.0);
          float shadowMask = skinProb * shadowFactor * (1.0 - eyeScore) * (1.0 - hairScore) * (1.0 - lipScore);
          if (shadowMask > 0.02) {
            vec3 lightened = result + (vec3(0.40, 0.37, 0.35) - result) * 0.6;
            result = mix(result, lightened, darkCircle * shadowMask * 1.5);
          }
        }
        
        // Definição de sobrancelha — escurece e dá contraste aos fios
        if (browDefinition > 0.0) {
          float lum = luminance(result);
          float browMask = step(0.04, lum) * (1.0 - step(0.40, lum)) * (1.0 - step(0.50, hsv.y)) * (1.0 - hairScore);
          if (browMask > 0.02) {
            result = mix(result, result * 0.82, browDefinition * browMask * 0.6);
            result = mix(result, result * (1.0 - edgeScore * 0.18), browDefinition * browMask * 0.8);
          }
        }
        
        // Remoção de manchas/acne — separação de frequência (estilo Tencent):
        // detecta o ponto escuro/avermelhado e SUBSTITUI pela cor média da pele
        // do entorno. O blur bilateral antigo PRESERVAVA a mancha (é uma borda
        // pequena!) — por isso o defeito não saía do rosto.
        if (acneRemoval > 0.0 && skinProb > 0.01) {
          float spot = spotScore(result, hsv, skinProb, eyeScore, lipScore, hairScore, uv, texelSize);
          if (spot > 0.03) {
            float radius = 2.5 + acneRemoval * 2.0;
            vec3 skinTone = skinLocalAverage(uv, texelSize, radius);
            float blend = spot * acneRemoval * 0.95;
            result = mix(result, skinTone, blend);
          }
        }
        
        // Redução de brilho (matte) — tira o reflexo especular da pele: áreas muito
        // claras E dessaturadas (o brilho "estoura" o matiz da pele)
        if (shineReduction > 0.0) {
          float lum = luminance(result);
          float highlight = clamp((lum - 0.58) / 0.26, 0.0, 1.0);
          float lowSat = 1.0 - hsv.y;
          float specMask = skinProb * highlight * lowSat * (1.0 - eyeScore) * (1.0 - lipScore) * (1.0 - hairScore);
          if (specMask > 0.02) {
            // Aproxima a cor do tom médio da pele (dessatura) e amacia o brilho
            float gray = luminance(result);
            result = mix(result, vec3(gray), specMask * shineReduction * 0.35);
            result = mix(result, result * 0.86, specMask * shineReduction * 0.55);
          }
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
        
        // 🌡️ Balanço de branco ~5400K — tira o tom amarelo/laranja (diminui o
        // vermelho e eleva levemente o azul), deixando cor de luz do dia.
        if (whiteBalance > 0.0) {
          result.r *= (1.0 - whiteBalance * 0.045);
          result.g *= (1.0 + whiteBalance * 0.012);
          result.b *= (1.0 + whiteBalance * 0.055);
          result = clamp(result, 0.0, 1.0);
        }
        
        // 🔍 Nitidez (unsharp mask) — clareza/micro-detalhe na imagem final
        if (sharpness > 0.0) {
          result = applySharpness(result, uv, texelSize, sharpness, skinMask);
        }
        
        // ✨ Efeito 3D / volume facial — modelagem de luz para aparência mais jovem
        if (faceVolume3D > 0.0) {
          result = applyFaceVolume3D(result, uv, texelSize, faceVolume3D, skinMask);
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
    this.uniformLocations.beautySettings2 = this.gl.getUniformLocation(this.program, 'u_beautySettings2');
    this.uniformLocations.beautySettings3 = this.gl.getUniformLocation(this.program, 'u_beautySettings3');
    this.uniformLocations.beautySettings4 = this.gl.getUniformLocation(this.program, 'u_beautySettings4');
    this.uniformLocations.featureSettings = this.gl.getUniformLocation(this.program, 'u_featureSettings');
    this.uniformLocations.faceMask = this.gl.getUniformLocation(this.program, 'u_faceMask');
    this.uniformLocations.faceMaskActive = this.gl.getUniformLocation(this.program, 'u_faceMaskActive');
    
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

    // Textura da máscara de pele (unidade 1) — mesmos parâmetros LINEAR/CLAMP
    // para a borda do oval sair suave (feather) sem serrilhado.
    this.maskTexture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.maskTexture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.activeTexture(this.gl.TEXTURE0);
    
    // 🎨 NÃO deixar o WebGL converter o espaço de cor do vídeo novamente ao
    // subir a textura. O <video> já entrega RGB (sRGB); com BROWSER_DEFAULT o
    // browser pode aplicar uma 2ª conversão e a track do canvas.captureStream()
    // sai com TOM AMARELADO/esverdeado no WebRTC (mismatch YUV→RGB BT.601/709).
    try {
      this.gl.pixelStorei(this.gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, this.gl.NONE);
    } catch (e) {
      // UNPACK_COLORSPACE_CONVERSION_WEBGL não existe em alguns contextos antigos
    }
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
    
    // 📏 Garantir que o canvas já esteja na proporção da fonte antes de capturar
    // (redundante com o waitForVideoSize do getVideoStream, mas cobre o caso do
    // fallback Canvas 2D e do restartProcessing).
    this.syncCanvasToSource();
    
    // Criar stream processado do canvas
    this.processedStream = this.canvas!.captureStream(this.config.fps);

    // 🔍 contentHint 'detail' no track do canvas: instrui o encoder WebRTC a
    // priorizar FIDELIDADE ESPACIAL (mais bitrate, menos blur/chiado) em vez do
    // default 'motion', que joga nitidez fora para economizar banda — a mesma
    // recomendação de nitidez da Tencent (MLVB/TRTC). Sem isso, o canvas track
    // costuma sair com cara de "TV velha". (Preferência vale também após o
    // replaceTrack, pois o sender mantém as mesmas parameters.)
    const procVideoTrack = this.processedStream.getVideoTracks()[0];
    if (procVideoTrack) {
      try { (procVideoTrack as any).contentHint = 'detail'; } catch { /* ignore */ }
    }
    
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
   * 📏 Sincroniza o canvas com a resolução NATIVA da câmera PRESERVANDO a
   * proporção (aspect ratio). O cap antigo limitava width E height de forma
   * INDEPENDENTE (1280/720): uma câmera portrait 1080x1920 virava 1080x720 e
   * uma 720x1280 virava 720x720 — esmagando o rosto e deixando o preview
   * "estranho". Agora escala mantendo a proporção até caber em 1920x1920 no
   * maior lado (portrait → 1080x1920, landscape → 1920x1080). Redimensiona só
   * quando a fonte muda de tamanho (evita re-alocação desnecessária).
   */
  private syncCanvasToSource(): void {
    if (!this.canvas) return;
    const src = this.getVideoSource() as any;
    const vw = src?.videoWidth ?? 0;
    const vh = src?.videoHeight ?? 0;
    if (!vw || !vh) return;
    const maxW = 1920, maxH = 1920;
    const scale = Math.min(1, maxW / vw, maxH / vh);
    const w = Math.max(2, Math.round(vw * scale));
    const h = Math.max(2, Math.round(vh * scale));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
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
      this.lastRenderAt = performance.now();
      
      // 📏 Canvas acompanha a resolução nativa da câmera (cap 1080p, casa com o
      // bitrate de publicação) — sem upscale borrado de 640x480.
      this.syncCanvasToSource();
      
      // Limpar canvas
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      // Usar programa
      gl.useProgram(program);
      
      // Atualizar textura do vídeo (com warp de malha facial se ativo)
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      let imageSource: TexImageSource = this.getVideoSource() as TexImageSource;
      if (!imageSource) {
        this.animationId = requestAnimationFrame(render);
        return;
      }
      if (this.meshActive && this.babyFaceProcessor && this.babyFaceProcessor.isReady()) {
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
      
      const uBeauty2 = uniformLocs.beautySettings2;
      if (uBeauty2) {
        gl.uniform4f(
          uBeauty2,
          this.beautySettings.teethWhitening || 0,
          this.beautySettings.wrinkleSmoothing || 0,
          this.beautySettings.darkCircle || 0,
          this.beautySettings.browDefinition || 0
        );
      }
      
      const uBeauty3 = uniformLocs.beautySettings3;
      if (uBeauty3) {
        gl.uniform4f(
          uBeauty3,
          this.beautySettings.acneRemoval || 0,
          this.beautySettings.shineReduction || 0,
          this.beautySettings.sharpness || 0,
          this.beautySettings.faceVolume3D || 0
        );
      }
      
      const uBeauty4 = uniformLocs.beautySettings4;
      if (uBeauty4) {
        gl.uniform4f(
          uBeauty4,
          this.beautySettings.whiteBalance || 0,
          this.beautySettings.noiseReduction || 0,
          0,
          0
        );
      }
      
      const uFeature = uniformLocs.featureSettings;
      if (uFeature) {
        // x: featureActive (1.0 = ligado), y: edgeStrength (1.0 padrão), z: preserveLips (1.0 = ligado), w: preserveEyes (1.0 = ligado)
        gl.uniform4f(uFeature, 1.0, 1.0, 1.0, 1.0);
      }

      // 🧑 Máscara de pele do rosto (MediaPipe): atualiza detecção (throttled),
      // sobe o canvas da máscara para a textura (unidade 1) e liga o uniform.
      // Sem rosto detectado / landmarker indisponível → uniform 0 = comportamento
      // antigo (só detecção por cor).
      if (this.faceSkinMask) {
        this.faceSkinMask.update(performance.now());
      }
      const maskCanvas = this.faceSkinMask?.canvas ?? null;
      const faceMaskOn = !!(this.faceSkinMask?.isReady() && this.faceSkinMask.hasFace() && maskCanvas && uniformLocs.faceMask);
      if (uniformLocs.faceMaskActive) {
        gl.uniform1f(uniformLocs.faceMaskActive, faceMaskOn ? 1.0 : 0.0);
      }
      if (faceMaskOn && maskCanvas && this.maskTexture) {
        try {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
          gl.uniform1i(uniformLocs.faceMask!, 1);
        } catch { /* máscara ainda sem frame — próximo frame tenta de novo */ }
        gl.activeTexture(gl.TEXTURE0);
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
      this.lastRenderAt = performance.now();

      // 📏 Canvas acompanha a resolução nativa da câmera (cap 1080p)
      this.syncCanvasToSource();

      // Com malha facial ativa, usa o frame warpeado como base
      let imageSource: CanvasImageSource | null = this.getVideoSource();
      if (!imageSource) {
        this.animationId = requestAnimationFrame(render);
        return;
      }
      if (this.meshActive && this.babyFaceProcessor && this.babyFaceProcessor.isReady()) {
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
    
    if ((this.beautySettings.teethWhitening || 0) > 0) {
      filters.push(`brightness(${1 + (this.beautySettings.teethWhitening || 0) / 300})`);
    }
    
    if ((this.beautySettings.darkCircle || 0) > 0) {
      filters.push(`brightness(${1 + (this.beautySettings.darkCircle || 0) / 500})`);
    }
    
    if ((this.beautySettings.browDefinition || 0) > 0) {
      filters.push(`contrast(${1 + (this.beautySettings.browDefinition || 0) / 400})`);
    }
    
    if ((this.beautySettings.acneRemoval || 0) > 0) {
      filters.push(`blur(${Math.min((this.beautySettings.acneRemoval || 0) / 220, 0.8)}px)`);
    }
    
    if ((this.beautySettings.shineReduction || 0) > 0) {
      filters.push(`brightness(${1 - (this.beautySettings.shineReduction || 0) / 600}) saturate(${1 - (this.beautySettings.shineReduction || 0) / 900})`);
    }
    
    if ((this.beautySettings.sharpness || 0) > 0) {
      filters.push(`contrast(${1 + (this.beautySettings.sharpness || 0) / 220})`);
    }
    
    if ((this.beautySettings.faceVolume3D || 0) > 0) {
      filters.push(`brightness(${1 + (this.beautySettings.faceVolume3D || 0) / 500}) contrast(${1 + (this.beautySettings.faceVolume3D || 0) / 300})`);
    }
    
    if ((this.beautySettings.noiseReduction || 0) > 0) {
      filters.push(`blur(${Math.min((this.beautySettings.noiseReduction || 0) / 180, 0.8)}px)`);
    }
    
    return filters.join(' ') || 'none';
  }

  /**
   * Configurações de beleza atuais (leitura p/ watchdog da sala etc.)
   */
  getBeautySettings(): BeautyEffectSettings {
    return { ...this.beautySettings };
  }

  /**
   * Atualizar configurações de beleza
   */
  updateBeautySettings(settings: Partial<BeautyEffectSettings>): void {
    this.beautySettings = { ...this.beautySettings, ...settings };
    this.syncNativeBeautySettings();

    this.meshActive = this.computeMeshActive();
    if (this.meshActive) {
      this.ensureBabyFace().then((ok) => {
        if (ok && this.babyFaceProcessor) {
          this.syncMeshParams();
        }
      });
    } else if (this.babyFaceProcessor) {
      this.babyFaceProcessor.setParams({
        babyFace: 0,
        lipFill: 0,
        lipAugment: 0,
        smileAdjust: 0,
        browThickness: 0,
        browCurve: 0,
        noseRefine: 0,
        jawChin: 0,
        eyeRefine: 0,
        browColor: '',
        browColorStrength: 0
      });
    }
  }

  /**
   * Verifica se algum efeito precisa da malha facial (MediaPipe)
   */
  private computeMeshActive(): boolean {
    return (this.beautySettings.babyFace || 0) > 0
      || (this.beautySettings.lipFill || 0) > 0
      || (this.beautySettings.lipAugment || 0) > 0
      || (this.beautySettings.smileAdjust || 0) > 0
      || (this.beautySettings.browThickness || 0) > 0
      || (this.beautySettings.browCurve || 0) > 0
      || (this.beautySettings.noseRefine || 0) > 0
      || (this.beautySettings.jawChin || 0) > 0
      || (this.beautySettings.eyeRefine || 0) > 0
      || (this.beautySettings.browColorStrength || 0) > 0;
  }

  /**
   * Repassa os efeitos de malha para o processador facial
   */
  private syncMeshParams(): void {
    if (!this.babyFaceProcessor) return;
    this.babyFaceProcessor.setParams({
      babyFace: (this.beautySettings.babyFace || 0) / 100,
      lipFill: (this.beautySettings.lipFill || 0) / 100,
      lipAugment: (this.beautySettings.lipAugment || 0) / 100,
      smileAdjust: (this.beautySettings.smileAdjust || 0) / 100,
      browThickness: (this.beautySettings.browThickness || 0) / 100,
      browCurve: (this.beautySettings.browCurve || 0) / 100,
      noseRefine: (this.beautySettings.noseRefine || 0) / 100,
      jawChin: (this.beautySettings.jawChin || 0) / 100,
      eyeRefine: (this.beautySettings.eyeRefine || 0) / 100,
      browColor: this.beautySettings.browColor || '',
      browColorStrength: (this.beautySettings.browColorStrength || 0) / 100
    });
  }

  /**
   * 🔥 Pré-carrega o MediaPipe Face Landmarker (wasm + modelo) o mais cedo
   * possível, para o Rosto Bebê/nariz/olhos/mandíbula começarem a funcionar na
   * hora. Com retry: se a 1ª carga falhar, o BabyFaceProcessor limpa o
   * initPromise e uma chamada seguinte tenta de novo.
   */
  async warmUpMesh(): Promise<boolean> {
    try {
      if (!this.babyFaceProcessor) {
        this.babyFaceProcessor = new BabyFaceProcessor();
      }
      return await this.babyFaceProcessor.preload();
    } catch (error) {
      console.error('❌ [VIDEO_PROCESSOR] Falha no warm-up do mesh:', error);
      return false;
    }
  }

  /**
   * Inicializar (lazy) o processador de malha facial com MediaPipe
   */
  private async ensureBabyFace(): Promise<boolean> {
    // 🎥 Amostra SEMPRE o vídeo DEDICADO de processamento (câmera crua), nunca o
    // elemento de preview — se o preview mostrar o stream processado (canvas),
    // amostrar ele criaria feedback loop (canvas de canvas).
    const sampleVideo = this.processingVideoElement || this.videoElement;
    if (!sampleVideo) return false;
    if (this.babyFaceProcessor) {
      const ok = this.babyFaceProcessor.isReady() || await this.babyFaceProcessor.initialize(sampleVideo);
      if (!ok) this.warnMeshInitFailed();
      return ok;
    }
    this.babyFaceProcessor = new BabyFaceProcessor();
    const ok = await this.babyFaceProcessor.initialize(sampleVideo);
    if (!ok) this.warnMeshInitFailed();
    return ok;
  }

  /** Log com rate-limit (1×/10s) quando a malha facial não consegue carregar. */
  private lastMeshWarnAt = 0;
  private warnMeshInitFailed(): void {
    const now = performance.now();
    if (now - this.lastMeshWarnAt < 10000) return;
    this.lastMeshWarnAt = now;
    console.warn('⚠️ [VIDEO_PROCESSOR] Malha facial (Rosto Bebê/lábios/sobrancelha) indisponível — tentará novamente no próximo update');
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
   * 🔄 Reiniciar o processamento com um NOVO elemento de vídeo/câmera (ex.: após
   * trocar de câmera frontal/traseira). Mantém as configurações de beleza atuais
   * e devolve um stream processado novo apontando para a câmera nova.
   */
  async restartProcessing(videoElement: HTMLVideoElement): Promise<MediaStream | null> {
    try {
      this.stopProcessing();
      const ok = await this.initialize(videoElement);
      if (!ok) return null;
      return this.startProcessing();
    } catch (e) {
      console.error('❌ [VIDEO_PROCESSOR] Erro ao reiniciar processamento:', e);
      return null;
    }
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
      this.babyFaceProcessor.setParams({
        babyFace: 0,
        lipFill: 0,
        lipAugment: 0,
        smileAdjust: 0,
        browThickness: 0,
        browCurve: 0,
        noseRefine: 0,
        jawChin: 0,
        eyeRefine: 0,
        browColor: '',
        browColorStrength: 0
      });
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

      if (this.maskTexture) {
        this.gl.deleteTexture(this.maskTexture);
        this.maskTexture = null;
      }
    }
    
    this.videoElement = null;
    this.canvas = null;
    this.gl = null;
    this.rawSourceStream = null;
    
    if (this.babyFaceProcessor) {
      this.babyFaceProcessor.destroy();
      this.babyFaceProcessor = null;
    }
    this.meshActive = false;

    if (this.faceSkinMask) {
      this.faceSkinMask.destroy();
      this.faceSkinMask = null;
    }
    
    this.cleanupProcessingVideo();
    
    console.log('🗑️ [VIDEO_PROCESSOR] Recursos liberados');
  }
}

// Instância global
export const videoProcessor = new VideoProcessor();

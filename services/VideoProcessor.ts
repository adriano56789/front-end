// Serviço de processamento de vídeo em tempo real com efeitos de beleza
// Implementação completa com WebGL para performance via GPU

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
  selectedFilter?: string;
}

export class VideoProcessor {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private stream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  
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
  } = {
    resolution: null,
    time: null,
    beautySettings: null
  };
  
  // Current beauty settings
  private beautySettings: BeautyEffectSettings = {
    whitening: 0,
    smoothing: 0,
    saturation: 0,
    contrast: 0,
    selectedFilter: ''
  };
  
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
    
    // Se o vídeo já tem um stream, usar ele
    if (this.videoElement.srcObject instanceof MediaStream) {
      return this.videoElement.srcObject;
    }
    
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
    
    return stream;
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
    
    // Fragment shader com efeitos de beleza
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec4 u_beautySettings; // whitening, smoothing, saturation, contrast
      
      varying vec2 v_texCoord;
      
      void main() {
        vec2 uv = v_texCoord;
        
        // Corrigir coordenadas de textura para vídeo
        uv.y = 1.0 - uv.y;
        
        // Obter cor original
        vec4 color = texture2D(u_texture, uv);
        
        // Extrair componentes
        float r = color.r;
        float g = color.g;
        float b = color.b;
        
        // 1. Branqueamento (whitening) - Brightness lift for high-end studio skin tones
        float whitening = u_beautySettings.x / 100.0;
        vec3 whitened = vec3(r, g, b);
        if (whitening > 0.0) {
          whitened = vec3(r, g, b) + (1.0 - vec3(r, g, b)) * whitening * 0.45;
        }
        
        // 2. Suavização de pele (smoothing) - bilateral-like soft aesthetic skin glow
        float smoothing = u_beautySettings.y / 100.0;
        if (smoothing > 0.0) {
          vec2 texelSize = 1.0 / u_resolution;
          vec3 blurred = vec3(0.0);
          
          // Kernel 3x3 simplificado com maior espalhamento para suavização visível
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              vec2 offset = vec2(float(x), float(y)) * texelSize * (1.0 + smoothing * 6.0);
              vec3 sample = texture2D(u_texture, uv + offset).rgb;
              blurred += sample;
            }
          }
          blurred /= 9.0;
          
          // Highly tolerant and inclusive skin tone classification (works on all face types and lighting profiles)
          float isSkin = (r > 0.12 && g > 0.06 && b > 0.03 && r > g && r > b) ? 1.0 : 0.0;
          float blendFactor = mix(smoothing * 0.25, smoothing * 0.95, isSkin);
          whitened = mix(whitened, blurred, blendFactor);
        }
        
        // 3. Saturação (ruborizar)
        float saturation = u_beautySettings.z / 100.0;
        float gray = 0.299 * whitened.r + 0.587 * whitened.g + 0.114 * whitened.b;
        vec3 saturated = mix(vec3(gray), whitened, 1.0 + saturation * 0.5);
        
        // 4. Contraste
        float contrast = u_beautySettings.w / 200.0;
        vec3 finalColor = (saturated - 0.5) * (1.0 + contrast) + 0.5;
        
        gl_FragColor = vec4(finalColor, color.a);
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
    if (!this.gl || !this.canvas || !this.videoElement || !this.program || !this.videoTexture || !this.positionBuffer || !this.textureBuffer) return;
    
    const gl = this.gl;
    const canvas = this.canvas;
    const videoElement = this.videoElement;
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
      
      // Atualizar textura do vídeo
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);
      
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
    if (!this.canvas || !this.videoElement) return;
    
    const canvas = this.canvas;
    const videoElement = this.videoElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      if (!this.isProcessing) return;
      
      // Desenhar vídeo no canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
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
    
    console.log('🗑️ [VIDEO_PROCESSOR] Recursos liberados');
  }
}

// Instância global
export const videoProcessor = new VideoProcessor();

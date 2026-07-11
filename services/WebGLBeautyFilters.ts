// Shaders e filtros de beleza avançados para WebGL
// Implementação de algoritmos profissionais de embelezamento

export interface ShaderConfig {
  name: string;
  vertexSource: string;
  fragmentSource: string;
  uniforms: string[];
}

export class WebGLBeautyFilters {
  private gl: WebGLRenderingContext | null = null;
  private programs: Map<string, WebGLProgram> = new Map();
  
  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.initializeShaders();
  }

  /**
   * Inicializar todos os shaders de beleza
   */
  private initializeShaders(): void {
    const shaders: ShaderConfig[] = [
      this.getSkinSmoothingShader(),
      this.getSkinWhiteningShader(),
      this.getFaceDetectionShader(),
      this.getBeautyEnhancementShader()
    ];

    shaders.forEach(shader => {
      const program = this.compileProgram(shader.vertexSource, shader.fragmentSource);
      if (program) {
        this.programs.set(shader.name, program);
        console.log(`✅ [WEBGL_FILTERS] Shader "${shader.name}" compilado`);
      } else {
        console.error(`❌ [WEBGL_FILTERS] Falha ao compilar "${shader.name}"`);
      }
    });
  }

  /**
   * Shader de suavização de pele (skin smoothing) com detecção facial seletiva
   */
  private getSkinSmoothingShader(): ShaderConfig {
    return {
      name: 'skinSmoothing',
      vertexSource: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_texCoord = a_texCoord;
        }
      `,
      fragmentSource: `
        precision mediump float;
        
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_smoothing;
        uniform float u_strength;
        uniform float u_preserveEyes;
        uniform float u_preserveLips;
        
        varying vec2 v_texCoord;
        
        // --- Funções auxiliares ---
        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        float luminance(vec3 rgb) {
          return dot(rgb, vec3(0.299, 0.587, 0.114));
        }
        
        float skinProbability(vec3 rgb, vec3 hsv) {
          bool range1 = hsv.x >= 0.0 && hsv.x <= 0.12 && hsv.y >= 0.04 && hsv.y <= 0.72 && hsv.z >= 0.15 && hsv.z <= 0.96;
          bool range2 = hsv.x >= 0.0 && hsv.x <= 0.16 && hsv.y >= 0.02 && hsv.y <= 0.55 && hsv.z >= 0.06 && hsv.z <= 0.82;
          bool range3 = hsv.x >= 0.0 && hsv.x <= 0.10 && hsv.y >= 0.01 && hsv.y <= 0.25 && hsv.z >= 0.35 && hsv.z <= 0.99;
          bool range4 = hsv.x >= 0.93 && hsv.x <= 1.0 && hsv.y >= 0.04 && hsv.y <= 0.55 && hsv.z >= 0.15 && hsv.z <= 0.85;
          bool range5 = hsv.x >= 0.08 && hsv.x <= 0.18 && hsv.y >= 0.03 && hsv.y <= 0.50 && hsv.z >= 0.12 && hsv.z <= 0.90;
          float prob = 0.0;
          if (range1) prob = 1.0;
          else if (range5) prob = 0.92;
          else if (range2) prob = 0.85;
          else if (range3) prob = 0.78;
          else if (range4) prob = 0.70;
          if (rgb.r > rgb.b * 1.08 && rgb.r > rgb.g * 0.82) prob = mix(prob, 1.0, 0.25);
          else prob = prob * 0.5;
          return clamp(prob, 0.0, 1.0);
        }
        
        float isEyeOrBrow(vec3 hsv) {
          if (u_preserveEyes < 0.5) return 0.0;
          if (hsv.z < 0.14 && hsv.y < 0.25) return 1.0;
          if (hsv.z < 0.08 && hsv.y < 0.15) return 1.0;
          return 0.0;
        }
        
        float isLip(vec3 hsv) {
          if (u_preserveLips < 0.5) return 0.0;
          bool reddish = (hsv.x >= 0.90 || hsv.x <= 0.06);
          if (reddish && hsv.y >= 0.30 && hsv.y <= 0.85 && hsv.z >= 0.20 && hsv.z <= 0.80) return 1.0;
          if (reddish && hsv.y >= 0.15 && hsv.y <= 0.85 && hsv.z >= 0.35 && hsv.z <= 0.80) return 0.6;
          return 0.0;
        }
        
        float edgeDetection(vec2 uv, vec2 texelSize) {
          float lum[9];
          int idx = 0;
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 offset = vec2(float(x), float(y)) * texelSize;
              lum[idx++] = luminance(texture2D(u_texture, uv + offset).rgb);
            }
          }
          float gx = lum[6] + 2.0 * lum[7] + lum[8] - (lum[0] + 2.0 * lum[1] + lum[2]);
          float gy = lum[2] + 2.0 * lum[5] + lum[8] - (lum[0] + 2.0 * lum[3] + lum[6]);
          return clamp(length(vec2(gx, gy)) * 1.5, 0.0, 1.0);
        }
        
        vec3 bilateralBlur(vec2 uv, vec2 texelSize, float radius, vec3 center) {
          vec3 result = vec3(0.0);
          float totalWeight = 0.0;
          float sigmaSpatial = max(radius * 0.5, 1.0);
          float sigmaColor = 0.08;
          float maxDist2 = radius * radius * 4.0;
          for (int x = -3; x <= 3; x++) {
            for (int y = -3; y <= 3; y++) {
              float dx = float(x);
              float dy = float(y);
              float dist2 = dx * dx + dy * dy;
              if (dist2 > maxDist2) continue;
              vec2 offset = vec2(dx, dy) * texelSize;
              vec3 sample = texture2D(u_texture, uv + offset).rgb;
              float spatialW = exp(-dist2 / (2.0 * sigmaSpatial * sigmaSpatial));
              float colorD = length(sample - center);
              float colorW = exp(-(colorD * colorD) / (2.0 * sigmaColor * sigmaColor));
              float w = spatialW * colorW;
              result += sample * w;
              totalWeight += w;
            }
          }
          return result / max(totalWeight, 0.001);
        }
        
        void main() {
          vec2 uv = v_texCoord;
          uv.y = 1.0 - uv.y;
          
          vec4 color = texture2D(u_texture, uv);
          
          if (u_smoothing > 0.0) {
            vec3 hsv = rgb2hsv(color.rgb);
            vec2 texelSize = 1.0 / u_resolution;
            
            // Mapa de detecção facial seletiva
            float skinProb = skinProbability(color.rgb, hsv);
            float eyeScore = isEyeOrBrow(hsv);
            float lipScore = isLip(hsv);
            float edgeScore = edgeDetection(uv, texelSize);
            float preserveMask = max(max(eyeScore, lipScore), edgeScore * 0.7);
            float skinMask = skinProb * (1.0 - preserveMask);
            
            if (skinMask > 0.01) {
              float radius = u_smoothing * 2.5;
              vec3 blurred = bilateralBlur(uv, texelSize, radius, color.rgb);
              float blend = skinMask * u_strength * 0.85;
              color.rgb = mix(color.rgb, blurred, blend);
            }
          }
          
          gl_FragColor = color;
        }
      `,
      uniforms: ['u_texture', 'u_resolution', 'u_smoothing', 'u_strength', 'u_preserveEyes', 'u_preserveLips']
    };
  }

  /**
   * Shader de branqueamento de pele (skin whitening)
   */
  private getSkinWhiteningShader(): ShaderConfig {
    return {
      name: 'skinWhitening',
      vertexSource: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_texCoord = a_texCoord;
        }
      `,
      fragmentSource: `
        precision mediump float;
        
        uniform sampler2D u_texture;
        uniform float u_whitening;
        uniform float u_preserve;
        
        varying vec2 v_texCoord;
        
        void main() {
          vec2 uv = v_texCoord;
          uv.y = 1.0 - uv.y;
          
          vec4 color = texture2D(u_texture, uv);
          
          if (u_whitening > 0.0) {
            // Converter para YUV para processamento mais preciso
            float y = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
            float u = -0.14713 * color.r - 0.28886 * color.g + 0.436 * color.b;
            float v = 0.615 * color.r - 0.51499 * color.g - 0.10001 * color.b;
            
            // Aumentar luminância (branqueamento)
            y = mix(y, 1.0, u_whitening * 0.3);
            
            // Preservar um pouco da cor original para look natural
            u = mix(u, 0.0, u_whitening * u_preserve);
            v = mix(v, 0.0, u_whitening * u_preserve);
            
            // Converter de volta para RGB
            float r = y + 1.13983 * v;
            float g = y - 0.39465 * u - 0.58060 * v;
            float b = y + 2.03211 * u;
            
            color = vec4(r, g, b, color.a);
          }
          
          gl_FragColor = color;
        }
      `,
      uniforms: ['u_texture', 'u_whitening', 'u_preserve']
    };
  }

  /**
   * Shader de detecção facial (face detection) — output aprimorado com máscaras
   */
  private getFaceDetectionShader(): ShaderConfig {
    return {
      name: 'faceDetection',
      vertexSource: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_texCoord = a_texCoord;
        }
      `,
      fragmentSource: `
        precision mediump float;
        
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_threshold;
        
        varying vec2 v_texCoord;
        
        // --- Funções auxiliares ---
        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        float luminance(vec3 rgb) {
          return dot(rgb, vec3(0.299, 0.587, 0.114));
        }
        
        float skinProbability(vec3 rgb, vec3 hsv) {
          bool range1 = hsv.x >= 0.0 && hsv.x <= 0.12 && hsv.y >= 0.04 && hsv.y <= 0.72 && hsv.z >= 0.15 && hsv.z <= 0.96;
          bool range2 = hsv.x >= 0.0 && hsv.x <= 0.16 && hsv.y >= 0.02 && hsv.y <= 0.55 && hsv.z >= 0.06 && hsv.z <= 0.82;
          bool range3 = hsv.x >= 0.0 && hsv.x <= 0.10 && hsv.y >= 0.01 && hsv.y <= 0.25 && hsv.z >= 0.35 && hsv.z <= 0.99;
          bool range4 = hsv.x >= 0.93 && hsv.x <= 1.0 && hsv.y >= 0.04 && hsv.y <= 0.55 && hsv.z >= 0.15 && hsv.z <= 0.85;
          bool range5 = hsv.x >= 0.08 && hsv.x <= 0.18 && hsv.y >= 0.03 && hsv.y <= 0.50 && hsv.z >= 0.12 && hsv.z <= 0.90;
          float prob = 0.0;
          if (range1) prob = 1.0;
          else if (range5) prob = 0.92;
          else if (range2) prob = 0.85;
          else if (range3) prob = 0.78;
          else if (range4) prob = 0.70;
          if (rgb.r > rgb.b * 1.08 && rgb.r > rgb.g * 0.82) prob = mix(prob, 1.0, 0.25);
          else prob = prob * 0.5;
          return clamp(prob, 0.0, 1.0);
        }
        
        float edgeDetection(vec2 uv, vec2 texelSize) {
          float lum[9];
          int idx = 0;
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 offset = vec2(float(x), float(y)) * texelSize;
              lum[idx++] = luminance(texture2D(u_texture, uv + offset).rgb);
            }
          }
          float gx = lum[6] + 2.0 * lum[7] + lum[8] - (lum[0] + 2.0 * lum[1] + lum[2]);
          float gy = lum[2] + 2.0 * lum[5] + lum[8] - (lum[0] + 2.0 * lum[3] + lum[6]);
          return clamp(length(vec2(gx, gy)) * 1.5, 0.0, 1.0);
        }
        
        void main() {
          vec2 uv = v_texCoord;
          uv.y = 1.0 - uv.y;
          
          vec4 color = texture2D(u_texture, uv);
          vec3 hsv = rgb2hsv(color.rgb);
          vec2 texelSize = 1.0 / u_resolution;
          
          // Mapa completo de detecção
          float skinProb = skinProbability(color.rgb, hsv);
          float edgeScore = edgeDetection(uv, texelSize);
          
          // Olhos/sobrancelhas (escuro, dessaturado)
          float eyeScore = (hsv.z < 0.14 && hsv.y < 0.25) ? 1.0 : 0.0;
          // Lábios
          float lipScore = 0.0;
          bool reddish = (hsv.x >= 0.90 || hsv.x <= 0.06);
          if (reddish && hsv.y >= 0.30 && hsv.y <= 0.85 && hsv.z >= 0.20 && hsv.z <= 0.80) lipScore = 1.0;
          // Cabelo
          float hairScore = (hsv.z < 0.06 && hsv.y < 0.12) ? 1.0 : 0.0;
          
          // Máscara combinada
          float preserveMask = max(max(eyeScore, lipScore), hairScore);
          preserveMask = max(preserveMask, edgeScore * 0.7);
          float skinMask = skinProb * (1.0 - preserveMask);
          
          // Output RGBA:
          // R: skinMask (probabilidade de pele sem features)
          // G: featureMask (olhos + lábios + cabelo + bordas)
          // B: edgeScore (bordas detectadas)
          // A: 1.0
          gl_FragColor = vec4(skinMask, preserveMask, edgeScore, 1.0);
        }
      `,
      uniforms: ['u_texture', 'u_resolution', 'u_threshold']
    };
  }

  /**
   * Shader de enhancement geral de beleza
   */
  private getBeautyEnhancementShader(): ShaderConfig {
    return {
      name: 'beautyEnhancement',
      vertexSource: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_texCoord = a_texCoord;
        }
      `,
      fragmentSource: `
        precision mediump float;
        
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform vec4 u_beautyParams; // x: whitening, y: smoothing, z: saturation, w: contrast
        uniform float u_time;
        
        varying vec2 v_texCoord;
        
        // --- Funções auxiliares ---
        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        float luminance(vec3 rgb) {
          return dot(rgb, vec3(0.299, 0.587, 0.114));
        }
        
        float skinProbability(vec3 rgb, vec3 hsv) {
          bool range1 = hsv.x >= 0.0 && hsv.x <= 0.12 && hsv.y >= 0.04 && hsv.y <= 0.72 && hsv.z >= 0.15 && hsv.z <= 0.96;
          bool range2 = hsv.x >= 0.0 && hsv.x <= 0.16 && hsv.y >= 0.02 && hsv.y <= 0.55 && hsv.z >= 0.06 && hsv.z <= 0.82;
          bool range3 = hsv.x >= 0.0 && hsv.x <= 0.10 && hsv.y >= 0.01 && hsv.y <= 0.25 && hsv.z >= 0.35 && hsv.z <= 0.99;
          bool range4 = hsv.x >= 0.93 && hsv.x <= 1.0 && hsv.y >= 0.04 && hsv.y <= 0.55 && hsv.z >= 0.15 && hsv.z <= 0.85;
          bool range5 = hsv.x >= 0.08 && hsv.x <= 0.18 && hsv.y >= 0.03 && hsv.y <= 0.50 && hsv.z >= 0.12 && hsv.z <= 0.90;
          float prob = 0.0;
          if (range1) prob = 1.0;
          else if (range5) prob = 0.92;
          else if (range2) prob = 0.85;
          else if (range3) prob = 0.78;
          else if (range4) prob = 0.70;
          if (rgb.r > rgb.b * 1.08 && rgb.r > rgb.g * 0.82) prob = mix(prob, 1.0, 0.25);
          else prob = prob * 0.5;
          return clamp(prob, 0.0, 1.0);
        }
        
        float isEyeOrBrow(vec3 hsv) {
          if (hsv.z < 0.14 && hsv.y < 0.25) return 1.0;
          if (hsv.z < 0.08 && hsv.y < 0.15) return 1.0;
          return 0.0;
        }
        
        float isLip(vec3 hsv) {
          bool reddish = (hsv.x >= 0.90 || hsv.x <= 0.06);
          if (reddish && hsv.y >= 0.30 && hsv.y <= 0.85 && hsv.z >= 0.20 && hsv.z <= 0.80) return 1.0;
          if (reddish && hsv.y >= 0.15 && hsv.y <= 0.85 && hsv.z >= 0.35 && hsv.z <= 0.80) return 0.6;
          return 0.0;
        }
        
        float edgeDetection(vec2 uv, vec2 texelSize) {
          float lum[9];
          int idx = 0;
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 offset = vec2(float(x), float(y)) * texelSize;
              lum[idx++] = luminance(texture2D(u_texture, uv + offset).rgb);
            }
          }
          float gx = lum[6] + 2.0 * lum[7] + lum[8] - (lum[0] + 2.0 * lum[1] + lum[2]);
          float gy = lum[2] + 2.0 * lum[5] + lum[8] - (lum[0] + 2.0 * lum[3] + lum[6]);
          return clamp(length(vec2(gx, gy)) * 1.5, 0.0, 1.0);
        }
        
        vec3 bilateralBlur(vec2 uv, vec2 texelSize, float radius, vec3 center) {
          vec3 result = vec3(0.0);
          float totalWeight = 0.0;
          float sigmaSpatial = max(radius * 0.5, 1.0);
          float sigmaColor = 0.08;
          float maxDist2 = radius * radius * 4.0;
          for (int x = -3; x <= 3; x++) {
            for (int y = -3; y <= 3; y++) {
              float dx = float(x);
              float dy = float(y);
              float dist2 = dx * dx + dy * dy;
              if (dist2 > maxDist2) continue;
              vec2 offset = vec2(dx, dy) * texelSize;
              vec3 sample = texture2D(u_texture, uv + offset).rgb;
              float spatialW = exp(-dist2 / (2.0 * sigmaSpatial * sigmaSpatial));
              float colorD = length(sample - center);
              float colorW = exp(-(colorD * colorD) / (2.0 * sigmaColor * sigmaColor));
              float w = spatialW * colorW;
              result += sample * w;
              totalWeight += w;
            }
          }
          return result / max(totalWeight, 0.001);
        }
        
        void main() {
          vec2 uv = v_texCoord;
          uv.y = 1.0 - uv.y;
          
          vec4 original = texture2D(u_texture, uv);
          vec3 rgb = original.rgb;
          vec3 hsv = rgb2hsv(rgb);
          vec2 texelSize = 1.0 / u_resolution;
          
          // Mapa de detecção facial seletiva
          float skinProb = skinProbability(rgb, hsv);
          float eyeScore = isEyeOrBrow(hsv);
          float lipScore = isLip(hsv);
          float edgeScore = edgeDetection(uv, texelSize);
          float preserveMask = max(max(eyeScore, lipScore), edgeScore * 0.7);
          float skinMask = skinProb * (1.0 - preserveMask);
          
          // 1. Whitening (branqueamento) — mais forte na pele
          if (u_beautyParams.x > 0.0) {
            float skinFactor = mix(0.2, 1.0, skinMask);
            rgb = rgb + (1.0 - rgb) * (u_beautyParams.x / 100.0) * 0.45 * skinFactor;
          }
          
          // 2. Smoothing (suavização) — APENAS na pele preservando features
          if (u_beautyParams.y > 0.0 && skinMask > 0.01) {
            float radius = (u_beautyParams.y / 100.0) * 2.5;
            vec3 blurred = bilateralBlur(uv, texelSize, radius, rgb);
            float blend = skinMask * (u_beautyParams.y / 100.0) * 0.85;
            rgb = mix(rgb, blurred, blend);
          }
          
          // 3. Saturation (saturação/rubor)
          if (u_beautyParams.z > 0.0) {
            float gray = luminance(rgb);
            float satStrength = 1.0 + (u_beautyParams.z / 100.0) * 0.5;
            float satMask = mix(satStrength, 1.0, preserveMask * 0.75);
            rgb = mix(vec3(gray), rgb, satMask);
          }
          
          // 4. Contrast
          if (u_beautyParams.w > 0.0) {
            rgb = (rgb - 0.5) * (1.0 + u_beautyParams.w / 200.0) + 0.5;
            rgb = clamp(rgb, 0.0, 1.0);
          }
          
          gl_FragColor = vec4(rgb, original.a);
        }
      `,
      uniforms: ['u_texture', 'u_resolution', 'u_beautyParams', 'u_time']
    };
  }

  /**
   * Compilar programa WebGL
   */
  private compileProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShader = this.compileShader(vertexSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('❌ [WEBGL_FILTERS] Link error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }

    return program;
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
      console.error('❌ [WEBGL_FILTERS] Shader error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Obter programa pelo nome
   */
  getProgram(name: string): WebGLProgram | null {
    return this.programs.get(name) || null;
  }

  /**
   * Aplicar filtro específico
   */
  applyFilter(
    filterName: string,
    texture: WebGLTexture,
    targetTexture: WebGLTexture,
    uniforms: Record<string, any>
  ): boolean {
    const program = this.getProgram(filterName);
    if (!program || !this.gl) return false;

    this.gl.useProgram(program);

    // Configurar uniforms
    Object.entries(uniforms).forEach(([name, value]) => {
      const location = this.gl!.getUniformLocation(program, name);
      if (location) {
        if (typeof value === 'number') {
          this.gl!.uniform1f(location, value);
        } else if (value instanceof Array) {
          if (value.length === 2) {
            this.gl!.uniform2f(location, value[0], value[1]);
          } else if (value.length === 4) {
            this.gl!.uniform4f(location, value[0], value[1], value[2], value[3]);
          }
        }
      }
    });

    // Renderizar com o filtro
    this.renderQuad();

    return true;
  }

  /**
   * Renderizar quad fullscreen
   */
  private renderQuad(): void {
    if (!this.gl) return;

    // Configurar geometria (quad)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]);

    // Position buffer
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.gl.getParameter(this.gl.CURRENT_PROGRAM), 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Texture coordinate buffer
    const texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);

    const texCoordLocation = this.gl.getAttribLocation(this.gl.getParameter(this.gl.CURRENT_PROGRAM), 'a_texCoord');
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Limpar recursos
   */
  destroy(): void {
    if (this.gl) {
      this.programs.forEach(program => {
        this.gl!.deleteProgram(program);
      });
      this.programs.clear();
    }
  }
}

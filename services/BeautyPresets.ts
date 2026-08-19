// BeautyPresets — Presets de beleza com parâmetros pré-definidos.
// Cada preset é um conjunto de FaceShapingParams + shader params.
// O babyFacePreset é o principal: reshape facial 3D + beauty para aparência jovem.

import { FaceShapingParams, getDefaultFaceShapingParams } from './Face3DShaper';
import { BeautyEffectSettings } from './VideoProcessor';

export interface BeautyPreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string; // emoji ou identificador
  faceShaping: Partial<FaceShapingParams>;
  shader: Partial<BeautyEffectSettings>;
  intensity: number; // 0-1 intensidade global do preset
}

// ============================================================
// PRESET: ROSTO DE BEBÊ (Baby Face)
// Combina remodelação facial 3D + beauty shader para rejuvenescer
// O rosto fica mais jovem, suave, com bochechas cheias,
// olhos maiores, nariz refinado e pele impecável.
// ============================================================
export const babyFacePreset: BeautyPreset = {
  id: 'baby-face',
  name: 'Rosto de Bebê',
  nameEn: 'Baby Face',
  description: 'Remodelação facial 3D: rosto mais jovem e suave',
  icon: '👶',

  faceShaping: {
    // === ROSTO ===
    slimFace: 30,           // Afinamento moderado
    vShape: 25,             // V-line sutil
    chinLength: -20,        // Queixo mais curto (jovem)
    cheekVolume: 40,        // Bochechas cheias (bebê)
    faceWidth: -10,         // Rosto levemente mais fino
    jawWidth: 15,           // Mandíbula suave
    cheekBone: 20,          // Maçãs do rosto definidas
    foreheadHeight: 5,      // Testa levemente mais alta

    // === OLHOS ===
    bigEye: 35,             // Olhos discretamente maiores
    eyeDistance: 0,         // Distância natural
    eyeHeight: 10,          // Olhos levemente mais abertos
    eyeWidth: 8,            // Olhos levemente mais largos
    eyeTilt: 0,             // Sem inclinação
    brightEye: 15,          // Olhos brilhantes

    // === NARIZ ===
    slimNose: 25,           // Nariz mais fino
    noseBridge: 10,         // Ponte definida
    noseWings: 15,          // Narinas mais finas
    noseLength: -5,         // Nariz levemente mais curto

    // === BOCA ===
    lipShape: 10,           // Lábios definidos
    lipHeight: 5,           // Lábios levemente mais cheios
    lipWidth: 0,            // Largura natural
    smileFace: 15,          // Sorriso sutil

    // === SOBRANCELHAS ===
    browAngle: 5,           // Levemente arqueadas
    browDistance: 0,        // Distância natural
    browHeight: 8,          // Levemente mais altas
    browLength: 0,          // Comprimento natural
    browThickness: 10,      // Levemente mais grossas
    browCurve: 12,          // Curva suave

    // === PELE (shader) ===
    smoothing: 55,          // Suavização moderada
    whitening: 25,          // Clareamento leve
    rosySkin: 20,           // Pele rosada
    contrast: 5,            // Contraste mínimo
    saturation: 10,         // Saturação leve
    sharpness: 20,          // Nitidez para preservar detalhes
    noiseReduction: 15,     // Limpar ruído
    teethWhitening: 10,     // Dentes levemente mais brancos
    wrinkleSmoothing: 30,   // Suavizar rugas
    darkCircle: 20,         // Clarear olheiras
    acneRemoval: 15,        // Remover manchas
    faceVolume3D: 25,       // Volume 3D (aparência jovem)
    whiteBalance: 5,        // Balanço de branco neutro
  },

  shader: {
    whitening: 25,
    smoothing: 55,
    saturation: 10,
    contrast: 5,
    teethWhitening: 10,
    wrinkleSmoothing: 30,
    darkCircle: 20,
    acneRemoval: 15,
    sharpness: 20,
    faceVolume3D: 25,
    noiseReduction: 15,
    whiteBalance: 5,
    babyFace: 0, // babyFace no shader antigo é substituído pelo mesh warping
  },

  intensity: 0.7 // 70% de intensidade padrão (configurável)
};

// ============================================================
// PRESET: NATURAL
// leve suavização + brilho, sem reshape facial
// ============================================================
export const naturalPreset: BeautyPreset = {
  id: 'natural',
  name: 'Natural',
  nameEn: 'Natural',
  description: 'Aparência natural com leve brilho',
  icon: '✨',
  faceShaping: {},
  shader: {
    whitening: 15,
    smoothing: 20,
    saturation: 5,
    contrast: 3,
    sharpness: 10,
    noiseReduction: 10,
  },
  intensity: 0.5
};

// ============================================================
// PRESET: MODELO
// Efeito mais forte, pele perfeita, olhos grandes
// ============================================================
export const modelPreset: BeautyPreset = {
  id: 'model',
  name: 'Modelo',
  nameEn: 'Model',
  description: 'Efeito forte estilo capa de revista',
  icon: '💄',
  faceShaping: {
    slimFace: 40,
    vShape: 30,
    bigEye: 40,
    slimNose: 30,
    cheekVolume: 25,
    chinLength: -15,
    smileFace: 10,
    browCurve: 15,
  },
  shader: {
    whitening: 35,
    smoothing: 65,
    saturation: 12,
    contrast: 8,
    sharpness: 25,
    noiseReduction: 20,
    wrinkleSmoothing: 40,
    darkCircle: 30,
    acneRemoval: 20,
    faceVolume3D: 30,
  },
  intensity: 0.85
};

// ============================================================
// PRESET: SEM EFEITO (OFF)
// ============================================================
export const offPreset: BeautyPreset = {
  id: 'off',
  name: 'Sem Efeito',
  nameEn: 'Off',
  description: 'Desativar todos os efeitos',
  icon: '🚫',
  faceShaping: {},
  shader: {},
  intensity: 0
};

// Todos os presets disponíveis
export const ALL_PRESETS: BeautyPreset[] = [
  offPreset,
  babyFacePreset,
  naturalPreset,
  modelPreset
];

// ============================================================
// Utilitários
// ============================================================

/**
 * Aplica um preset com intensidade configurável.
 * Retorna parâmetros combinados (preset × intensidade).
 */
export function applyPreset(
  preset: BeautyPreset,
  intensity: number = preset.intensity
): { faceShaping: Partial<FaceShapingParams>; shader: Partial<BeautyEffectSettings> } {
  const scale = (val: number) => Math.round(val * intensity);

  const faceShaping: Partial<FaceShapingParams> = {};
  for (const [key, val] of Object.entries(preset.faceShaping)) {
    if (typeof val === 'number') {
      (faceShaping as any)[key] = scale(val);
    } else {
      (faceShaping as any)[key] = val;
    }
  }

  const shader: Partial<BeautyEffectSettings> = {};
  for (const [key, val] of Object.entries(preset.shader)) {
    if (typeof val === 'number') {
      (shader as any)[key] = scale(val);
    } else {
      (shader as any)[key] = val;
    }
  }

  return { faceShaping, shader };
}

/**
 * Combina múltiplos presets (merge последний vence).
 */
export function mergePresets(...presets: Partial<FaceShapingParams>[]): Partial<FaceShapingParams> {
  return Object.assign({}, ...presets);
}

/**
 * Converte FaceShapingParams para BeautyEffectSettings (compatibilidade com VideoProcessor antigo)
 */
export function faceShapingToShaderSettings(params: Partial<FaceShapingParams>): Partial<BeautyEffectSettings> {
  return {
    whitening: params.whitening || 0,
    smoothing: params.smoothing || 0,
    saturation: params.saturation || 0,
    contrast: params.contrast || 0,
    teethWhitening: params.teethWhitening || 0,
    wrinkleSmoothing: params.wrinkleSmoothing || 0,
    darkCircle: params.darkCircle || 0,
    acneRemoval: params.acneRemoval || 0,
    sharpness: params.sharpness || 0,
    faceVolume3D: params.faceVolume3D || 0,
    noiseReduction: params.noiseReduction || 0,
    whiteBalance: params.whiteBalance || 0,
    // Mesh params que o BabyFaceProcessor antigo usava
    babyFace: 0, // agora é pelo Face3DShaper
    lipFill: params.lipShape || 0,
    lipAugment: params.lipHeight || 0,
    smileAdjust: params.smileFace || 0,
    browThickness: params.browThickness || 0,
    browCurve: params.browCurve || 0,
    noseRefine: params.slimNose || 0,
    jawChin: params.vShape || 0,
    eyeRefine: params.bigEye || 0,
    browColor: params.browColor || '',
    browColorStrength: params.browColorStrength || 0,
  };
}

import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon } from '../icons';
import { api } from '../../services/api';
import { BeautySettings, User, ToastType } from '../../types';
import { DEFAULT_BEAUTY_SETTINGS } from '../../services/VideoProcessor';
import { beautyState } from '../../services/BeautyEngine';
import { ALL_PRESETS, applyPreset, BeautyPreset } from '../../services/BeautyPresets';

const WhitenIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 10C21.5 10 16 16.5 16 26.5C16 38.5 22.5 45.5 32 45.5C41.5 45.5 48 38.5 48 26.5C48 16.5 42.5 10 32 10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 27C25.5 28.5 27.5 28.5 29 27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M35 27C36.5 28.5 38.5 28.5 40 27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M28 36C29.5 37.5 32.5 37.5 34 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M43 38L44.5 41L47.5 42.5L44.5 44L43 47L41.5 44L38.5 42.5L41.5 41L43 38Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const SmoothIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 36C18 36 22 40 28 40C34 40 38 36 44 36C50 36 52 38 52 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M12 44C18 44 22 48 28 48C34 48 38 44 44 44C50 44 52 46 52 46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 14C32 14 24 23 24 27C24 31.4 27.6 35 32 35C36.4 35 40 31.4 40 27C40 23 32 14 32 14Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M35 25C35 23.5 34.5 22 34 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const VividColorIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2.5" />
    <path d="M32 12C37 17 40 24 40 32C40 40 37 47 32 52C27 47 24 40 24 32C24 24 27 17 32 12Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M12 32H52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    <circle cx="21" cy="26" r="3" fill="#f43f5e" />
    <circle cx="42" cy="24" r="3" fill="#a855f7" />
    <circle cx="22" cy="40" r="3" fill="#f59e0b" />
    <circle cx="44" cy="42" r="3" fill="#22c55e" />
  </svg>
);

const SharpnessIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8L36 26L54 22L44 36L58 42L42 46L46 62L34 50L22 62L24 46L8 42L22 36L12 22L30 26L32 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="32" cy="35" r="6" stroke="currentColor" strokeWidth="2.5" />
  </svg>
);

const DenoiseIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 10C21.5 10 16 16.5 16 26.5C16 38.5 22.5 45.5 32 45.5C41.5 45.5 48 38.5 48 26.5C48 16.5 42.5 10 32 10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 20C22.5 21.5 24.5 22 27 21.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M37 21.5C39.5 22 41.5 21.5 44 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M24 32C26 33 28 33 30 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M34 32C36 33 38 33 40 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M25 40L28 42L31 40L34 42L37 40L40 42L43 40L45 41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FaceSmoothIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8C20.9 8 12 16.9 12 28C12 41 24 50 32 56C40 50 52 41 52 28C52 16.9 43.1 8 32 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M23 27C24.3 28.3 26.2 28.3 27.5 27" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M36.5 27C37.8 28.3 39.7 28.3 41 27" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M27 38C29.5 40 34.5 40 37 38" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M46 12L47.2 15.8L51 17L47.2 18.2L46 22L44.8 18.2L41 17L44.8 15.8L46 12Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);

interface BeautyEffectsPanelProps {
    onClose: () => void;
    currentUser: User;
    addToast: (type: ToastType, message: string) => void;
}

interface SimpleEffect {
    key: string;
    label: string;
    icon: (className?: string) => React.ReactElement;
}

const BlushIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="36" r="10" fill="#f43f5e" opacity="0.6" />
    <circle cx="42" cy="36" r="10" fill="#f43f5e" opacity="0.6" />
    <path d="M32 8C20.9 8 12 16.9 12 28C12 41 24 50 32 56C40 50 52 41 52 28C52 16.9 43.1 8 32 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
  </svg>
);

const LipstickIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8L36 26L54 22L44 36L58 42L42 46L46 62L34 50L22 62L24 46L8 42L22 36L12 22L30 26L32 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="32" cy="35" r="6" fill="#dc2626" stroke="currentColor" strokeWidth="2.5" />
  </svg>
);

const EyeShadowIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="24" cy="28" rx="12" ry="7" fill="#8b5cf6" opacity="0.5" />
    <ellipse cx="40" cy="28" rx="12" ry="7" fill="#8b5cf6" opacity="0.5" />
    <circle cx="24" cy="28" r="5" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="40" cy="28" r="5" stroke="currentColor" strokeWidth="2.5" />
    <path d="M14 38C18 42 28 44 32 44C36 44 46 42 50 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// 6 efeitos visíveis no painel (sliders)
const SIMPLE_EFFECTS: SimpleEffect[] = [
    { key: 'Suavização do rosto', label: 'Suavização do rosto', icon: (c) => <FaceSmoothIcon className={c} /> },
    { key: 'Branquear', label: 'Branquear', icon: (c) => <WhitenIcon className={c} /> },
    { key: 'Alisar a pele', label: 'Alisar a pele', icon: (c) => <SmoothIcon className={c} /> },
    { key: 'Limpar Chiado', label: 'Limpar Chiado', icon: (c) => <DenoiseIcon className={c} /> },
    { key: 'Ruborizar', label: 'Cor Viva', icon: (c) => <VividColorIcon className={c} /> },
    { key: 'Nitidez', label: 'Nitidez', icon: (c) => <SharpnessIcon className={c} /> },
    { key: 'Blush', label: 'Blush', icon: (c) => <BlushIcon className={c} /> },
    { key: 'Batom', label: 'Batom', icon: (c) => <LipstickIcon className={c} /> },
    { key: 'Sombra', label: 'Sombra', icon: (c) => <EyeShadowIcon className={c} /> },
];

// Filtros de cor — estilo TRTC (procedurais, zero dependência)
const FILTER_OPTIONS = [
    { id: '', name: 'Original', icon: '⊘' },
    { id: 'fresh', name: 'Fresh', icon: '🌸' },
    { id: 'rosy', name: 'Rosy', icon: '🌹' },
    { id: 'bw', name: 'P&B', icon: '◐' },
    { id: 'japanese', name: 'Japanese', icon: '🎎' },
    { id: 'warm', name: 'Warm', icon: '☀️' },
    { id: 'cool', name: 'Cool', icon: '❄️' },
    { id: 'vintage', name: 'Vintage', icon: '📷' },
];

// 15 efeitos padrão — salvos junto com os 6 visíveis
const DEFAULT_KEYS: Record<string, number> = {
    'Suavização do rosto': 35,
    'Branquear': DEFAULT_BEAUTY_SETTINGS.whitening,
    'Alisar a pele': DEFAULT_BEAUTY_SETTINGS.smoothing,
    'Ruborizar': DEFAULT_BEAUTY_SETTINGS.saturation,
    'Contraste': DEFAULT_BEAUTY_SETTINGS.contrast,
    'Balanço de Branco': DEFAULT_BEAUTY_SETTINGS.whiteBalance,
    'Rosto Bebê': DEFAULT_BEAUTY_SETTINGS.babyFace,
    'Clarear dentes': DEFAULT_BEAUTY_SETTINGS.teethWhitening,
    'Suavizar rugas': DEFAULT_BEAUTY_SETTINGS.wrinkleSmoothing,
    'Clarear olheiras': DEFAULT_BEAUTY_SETTINGS.darkCircle,
    'Remover manchas': DEFAULT_BEAUTY_SETTINGS.acneRemoval,
    'Reduzir brilho': DEFAULT_BEAUTY_SETTINGS.shineReduction,
    'Nitidez': DEFAULT_BEAUTY_SETTINGS.sharpness,
    'Efeito 3D': DEFAULT_BEAUTY_SETTINGS.faceVolume3D,
    'Limpar Chiado': DEFAULT_BEAUTY_SETTINGS.noiseReduction,
    'Blush': 0,
    'Batom': 0,
    'Sombra': 0,
};

const BeautyEffectsPanel: React.FC<BeautyEffectsPanelProps> = ({ onClose, currentUser, addToast }) => {
    const [selectedEffect, setSelectedEffect] = useState('Branquear');
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState('');
    const [settings, setSettings] = useState<BeautySettings>({});
    const [isLoading, setIsLoading] = useState(true);
    const saveTimeout = useRef<number | null>(null);

    const convertSettingsToBeautyParams = (apiSettings: BeautySettings) => {
        const num = (v: any, fallback: number) => typeof v === 'number' ? v : fallback;
        return {
            whitening: num(apiSettings['Branquear'], 0),
            smoothing: num(apiSettings['Alisar a pele'], 0),
            saturation: num(apiSettings['Ruborizar'], 0),
            contrast: num(apiSettings['Contraste'], 0),
            babyFace: num(apiSettings['Rosto Bebê'], 0),
            teethWhitening: num(apiSettings['Clarear dentes'], 0),
            wrinkleSmoothing: num(apiSettings['Suavizar rugas'], 0),
            darkCircle: num(apiSettings['Clarear olheiras'], 0),
            acneRemoval: num(apiSettings['Remover manchas'], 0),
            shineReduction: num(apiSettings['Reduzir brilho'], 0),
            whiteBalance: num(apiSettings['Balanço de Branco'], 0),
            sharpness: num(apiSettings['Nitidez'], 0),
            faceVolume3D: num(apiSettings['Efeito 3D'], 0),
            noiseReduction: num(apiSettings['Limpar Chiado'], 0),
            blush: num(apiSettings['Blush'], 0),
            lipstick: num(apiSettings['Batom'], 0),
            eyeshadow: num(apiSettings['Sombra'], 0),
        };
    };

    // Carregar configurações salvas no banco → beautyState (single source of truth)
    useEffect(() => {
        if (currentUser?.id) {
            setIsLoading(true);
            api.getBeautySettings(currentUser.id)
                .then(data => {
                    const loaded = data || {};
                    const effective = { ...DEFAULT_KEYS, ...loaded };
                    setSettings(effective);

                    if (typeof effective['selectedEffect'] === 'string' && SIMPLE_EFFECTS.some(e => e.key === effective['selectedEffect'])) {
                        setSelectedEffect(effective['selectedEffect'] as string);
                    }

                    // beautyState é a single source of truth — atualiza ele e
                    // o VideoProcessor sincroniza automaticamente via subscription
                    beautyState.update(convertSettingsToBeautyParams(effective));

                    // Restaurar filtro de cor salvo
                    const savedFilter = typeof effective['selectedFilter'] === 'string' ? effective['selectedFilter'] : '';
                    if (savedFilter) {
                        setSelectedFilter(savedFilter);
                        beautyState.set('selectedFilter', savedFilter);
                    }

                    // Auto-save: garante que TODOS os campos existem no banco
                    const missingFields = Object.keys(DEFAULT_KEYS).filter(k => !(k in loaded));
                    if (missingFields.length > 0) {
                        api.updateBeautySettings(currentUser.id, effective as BeautySettings)
                            .catch(() => {});
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch beauty settings:", err);
                    addToast(ToastType.Error, "Não foi possível carregar os efeitos de beleza.");
                })
                .finally(() => setIsLoading(false));
        }
    }, [currentUser]);

    // Salvar no banco (debounced) junto com padrões escondidos
    const saveSettings = (newSettings: BeautySettings) => {
        if (saveTimeout.current) {
            clearTimeout(saveTimeout.current);
        }
        saveTimeout.current = window.setTimeout(() => {
            if (currentUser?.id) {
                const completeSettings: BeautySettings = {
                    ...DEFAULT_KEYS,
                    ...newSettings,
                    selectedEffect,
                };
                // Salva nas 2 APIs: settings original + beauty-store dedicado
                Promise.all([
                    api.updateBeautySettings(currentUser.id, completeSettings).catch(err => {
                        console.error('❌ [BEAUTY_PANEL] Erro ao salvar configurações:', err);
                    }),
                    api.updateBeautyStoreAll(currentUser.id, completeSettings as Record<string, number>).catch(err => {
                        console.error('❌ [BEAUTY_STORE] Erro ao salvar beauty-store:', err);
                    }),
                ]).catch(() => {
                    addToast(ToastType.Error, "Falha ao salvar o efeito.");
                });
            }
        }, 500);
    };

    useEffect(() => {
        return () => {
            if (saveTimeout.current) {
                clearTimeout(saveTimeout.current);
            }
        };
    }, []);

    // Slider muda → atualiza beautyState (single source of truth)
    // O VideoProcessor se inscreve e sincroniza automaticamente
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        const newSettings = {
            ...settings,
            [selectedEffect]: value
        };
        setSettings(newSettings);
        saveSettings(newSettings);
        setSelectedPresetId(null);

        // "Suavização do rosto" é chave mestre: controla smoothing + whitening
        if (selectedEffect === 'Suavização do rosto') {
            const withMaster = {
                ...newSettings,
                'Alisar a pele': value,
                'Branquear': Math.min(60, Math.round(value * 1.15)),
            };
            setSettings(withMaster);
            beautyState.update(convertSettingsToBeautyParams(withMaster));
            return;
        }

        // Todos os outros: envia TODOS os valores via beautyState
        beautyState.update(convertSettingsToBeautyParams(newSettings));
    };

    const handleEffectSelect = (effectName: string) => {
        setSelectedEffect(effectName);
        const completeSettings: BeautySettings = {
            ...settings,
            selectedEffect: effectName,
        };
        saveSettings(completeSettings);
    };

    const resetEffects = () => {
        const resetSettings: BeautySettings = { ...DEFAULT_KEYS };
        setSettings(resetSettings);
        saveSettings(resetSettings);
        setSelectedEffect('Branquear');
        setSelectedPresetId(null);
        setSelectedFilter('');
        beautyState.reset();
    };

    const handleFilterSelect = (filterId: string) => {
        setSelectedFilter(filterId);
        beautyState.set('selectedFilter', filterId);
    };

    const handlePresetSelect = (preset: BeautyPreset) => {
        setSelectedPresetId(preset.id);

        if (preset.id === 'off') {
            resetEffects();
            return;
        }

        const applied = applyPreset(preset, preset.intensity);

        // Map faceShaping → BabyFaceProcessor params
        const fs = applied.faceShaping;
        const babyFaceVal = Object.keys(fs).length > 0 ? Math.round(preset.intensity * 100) : 0;

        const newSettings: BeautySettings = {
            'Suavização do rosto': 35,
            'Branquear': applied.shader.whitening ?? 0,
            'Alisar a pele': applied.shader.smoothing ?? 0,
            'Ruborizar': applied.shader.saturation ?? 0,
            'Contraste': applied.shader.contrast ?? 0,
            'Balanço de Branco': applied.shader.whiteBalance ?? 0,
            'Rosto Bebê': babyFaceVal,
            'Clarear dentes': applied.shader.teethWhitening ?? 0,
            'Suavizar rugas': applied.shader.wrinkleSmoothing ?? 0,
            'Clarear olheiras': applied.shader.darkCircle ?? 0,
            'Remover manchas': applied.shader.acneRemoval ?? 0,
            'Reduzir brilho': 0,
            'Nitidez': applied.shader.sharpness ?? 0,
            'Efeito 3D': applied.shader.faceVolume3D ?? 0,
            'Limpar Chiado': applied.shader.noiseReduction ?? 0,
        };

        setSettings(newSettings);
        saveSettings(newSettings);
        beautyState.update({
            whitening: applied.shader.whitening ?? 0,
            smoothing: applied.shader.smoothing ?? 0,
            saturation: applied.shader.saturation ?? 0,
            contrast: applied.shader.contrast ?? 0,
            whiteBalance: applied.shader.whiteBalance ?? 0,
            sharpness: applied.shader.sharpness ?? 0,
            noiseReduction: applied.shader.noiseReduction ?? 0,
            faceVolume3D: applied.shader.faceVolume3D ?? 0,
            teethWhitening: applied.shader.teethWhitening ?? 0,
            babyFace: babyFaceVal,
            lipFill: fs.lipShape ?? 0,
            lipAugment: fs.lipHeight ?? 0,
            smileAdjust: fs.smileFace ?? 0,
            browThickness: fs.browThickness ?? 0,
            browCurve: fs.browCurve ?? 0,
            noseRefine: fs.slimNose ?? 0,
            jawChin: fs.vShape ?? 0,
            eyeRefine: fs.bigEye ?? 0,
            wrinkleSmoothing: applied.shader.wrinkleSmoothing ?? 0,
            darkCircle: applied.shader.darkCircle ?? 0,
            acneRemoval: applied.shader.acneRemoval ?? 0,
            shineReduction: 0,
        });
    };

    const currentEffectValue = settings[selectedEffect] ?? 0;

    return (
        <div className="absolute inset-x-0 bottom-0 bg-[#0c0c0f] border-t border-white/5 rounded-t-[28px] z-50 p-4 pb-7 shadow-2xl animate-fade-in max-h-[40vh] overflow-y-auto no-scrollbar overscroll-contain" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center space-x-6">
                    <span className="font-sans text-[15px] text-white font-extrabold tracking-wide">Embelezar</span>
                    <button
                        onClick={resetEffects}
                        className="transition-colors font-sans text-[15px] text-[#717175] font-semibold hover:text-white"
                    >
                        Redefinir
                    </button>
                </div>
                <div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 bg-[#28282c] rounded-full flex items-center justify-center text-white hover:bg-[#34343a] transition-all"
                    >
                        <CloseIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Presets */}
            <div className="overflow-x-auto no-scrollbar text-center mb-4 -mx-1 px-1">
                <div className="flex gap-2.5 min-w-max justify-start">
                    {ALL_PRESETS.map((preset) => {
                        const isActive = selectedPresetId === preset.id;
                        return (
                            <button
                                key={preset.id}
                                onClick={() => handlePresetSelect(preset)}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-sans font-semibold transition-all duration-200 shrink-0 ${
                                    isActive
                                        ? 'bg-[#a855f7] text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                                        : 'bg-[#1b1b1f] text-[#a1a1aa] border border-white/5 hover:border-white/15 hover:text-white'
                                }`}
                            >
                                <span>{preset.icon}</span>
                                <span>{preset.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filtros de cor — estilo TRTC */}
            <div className="overflow-x-auto no-scrollbar text-center mb-4 -mx-1 px-1">
                <div className="flex gap-2 min-w-max justify-start">
                    {FILTER_OPTIONS.map((f) => {
                        const isActive = selectedFilter === f.id;
                        return (
                            <button
                                key={f.id}
                                onClick={() => handleFilterSelect(f.id)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-sans font-semibold transition-all duration-200 shrink-0 ${
                                    isActive
                                        ? 'bg-[#f59e0b] text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                        : 'bg-[#1b1b1f] text-[#717175] border border-white/5 hover:border-white/15 hover:text-white'
                                }`}
                            >
                                <span>{f.icon}</span>
                                <span>{f.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center space-x-4 mb-4 px-1.5 mt-2">
                <span className="text-[#a855f7] font-sans font-black text-base w-7 text-center shrink-0">
                    {currentEffectValue}
                </span>
                <div className="relative flex-1 flex items-center h-5">
                    <div className="absolute left-0 right-0 h-[3px] bg-[#242428] rounded-full" />
                    <div
                        className="absolute left-0 h-[3px] bg-[#a855f7] rounded-full"
                        style={{ width: `${currentEffectValue}%` }}
                    />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentEffectValue}
                        onChange={handleSliderChange}
                        disabled={isLoading}
                        className="w-full h-full appearance-none bg-transparent cursor-pointer relative z-10 focus:outline-none
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[4px]
                                   [&::-webkit-slider-thumb]:border-[#a855f7] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(168,85,247,0.8)]
                                   [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                                   [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-[4px] [&::-moz-range-thumb]:border-[#a855f7]
                                   [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                    />
                </div>
            </div>

            <div className="overflow-x-auto no-scrollbar text-center mt-4 -mx-1 px-1">
                <div className="flex gap-3 min-w-max justify-start">
                    {SIMPLE_EFFECTS.map((e) => {
                        const isSelected = selectedEffect === e.key;
                        return (
                            <button
                                key={e.key}
                                onClick={() => handleEffectSelect(e.key)}
                                className="flex flex-col items-center space-y-2.5 focus:outline-none group shrink-0"
                            >
                                <div className={`w-[72px] h-[72px] rounded-[18px] flex items-center justify-center transition-all duration-300 relative ${isSelected ? 'bg-[#201d2a]/60 border-[2.5px] border-[#a552f4] shadow-[0_0_15px_rgba(168,85,247,0.25)] scale-105' : 'bg-[#1b1b1f] border border-white/5 hover:border-white/10 group-hover:scale-102'}`}>
                                    {e.icon(`w-7 h-7 transition-all duration-300 ${isSelected ? 'text-[#a855f7] drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-gray-400'}`)}
                                </div>
                                <span className={`text-[11px] font-sans font-medium transition-colors ${isSelected ? 'text-white font-bold' : 'text-[#a1a1aa] group-hover:text-white'}`} translate="no">
                                    {e.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BeautyEffectsPanel;

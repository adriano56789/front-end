import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon } from '../icons';
import { api } from '../../services/api';
import { BeautySettings, User, ToastType } from '../../types';
import { videoProcessor, DEFAULT_BEAUTY_SETTINGS, BeautyEffectSettings } from '../../services/VideoProcessor';
import { beautyWebRTCIntegration } from '../../services/BeautyWebRTCIntegration';

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

interface BeautyEffectsPanelProps {
    onClose: () => void;
    currentUser: User;
    addToast: (type: ToastType, message: string) => void;
    videoRef?: React.RefObject<HTMLVideoElement | null>;
}

interface SimpleEffect {
    key: string;
    label: string;
    icon: (className?: string) => React.ReactElement;
}

// 🎛️ Painel SIMPLES: só o essencial para deixar a imagem bonita, colorida e
// nítida. 'Ruborizar' é a chave do banco para COR VIVA (saturação).
const SIMPLE_EFFECTS: SimpleEffect[] = [
    { key: 'Branquear', label: 'Branquear', icon: (c) => <WhitenIcon className={c} /> },
    { key: 'Alisar a pele', label: 'Alisar a pele', icon: (c) => <SmoothIcon className={c} /> },
    { key: 'Limpar Chiado', label: 'Limpar Chiado', icon: (c) => <DenoiseIcon className={c} /> },
    { key: 'Ruborizar', label: 'Cor Viva', icon: (c) => <VividColorIcon className={c} /> },
    { key: 'Nitidez', label: 'Nitidez', icon: (c) => <SharpnessIcon className={c} /> },
];

// 🎯 Padrões por trás das cenas (rejuvenescer, sem mancha, balanço de branco…)
// salvos junto com o básico — assim a live já entra bonita mesmo se o usuário
// só mexeu no painel simples.
const DEFAULT_KEYS: Record<string, number> = {
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
};

const BeautyEffectsPanel: React.FC<BeautyEffectsPanelProps> = ({ onClose, currentUser, addToast, videoRef }) => {
    const [selectedEffect, setSelectedEffect] = useState('Branquear');
    const [settings, setSettings] = useState<BeautySettings>({});
    const [isLoading, setIsLoading] = useState(true);
    const saveTimeout = useRef<number | null>(null);
    const effectCssRef = useRef<Record<string, string>>({});
    const baseFilterRef = useRef<string>('');
    const initializingRef = useRef(false);

    const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
        if (!videoRef?.current) {
            const videoEl = document.querySelector('video');
            if (videoEl) {
                fallbackVideoRef.current = videoEl;
            }
        }
    }, [videoRef]);

    const activeVideoRef = videoRef || fallbackVideoRef;

    // Carregar configurações salvas no banco (valores salvos vencem os padrão)
    useEffect(() => {
        if (currentUser?.id) {
            setIsLoading(true);
            api.getBeautySettings(currentUser.id)
                .then(data => {
                    const loaded = data || {};
                    const effective = {
                        ...DEFAULT_KEYS,
                        ...loaded,
                    };
                    setSettings(effective);

                    if (typeof effective['selectedEffect'] === 'string' && SIMPLE_EFFECTS.some(e => e.key === effective['selectedEffect'])) {
                        setSelectedEffect(effective['selectedEffect'] as string);
                    }

                    videoProcessor.updateBeautySettings(convertSettingsToBeautySettings(effective));

                    if (activeVideoRef?.current && !beautyWebRTCIntegration.isBeautyActive()) {
                        initializeBeautyProcessing();
                    }

                    Object.entries(effective).forEach(([effectName, val]) => {
                        if (typeof val === 'number') {
                            applyEffectToVideo(effectName, val);
                        }
                    });
                })
                .catch(err => {
                    console.error("Failed to fetch beauty settings:", err);
                    addToast(ToastType.Error, "Não foi possível carregar os efeitos de beleza.");
                })
                .finally(() => setIsLoading(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, activeVideoRef]);

    // Inicializar processamento de beleza quando o painel abrir
    useEffect(() => {
        if (activeVideoRef?.current && currentUser?.id) {
            initializeBeautyProcessing();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeVideoRef, currentUser]);

    const convertSettingsToBeautySettings = (apiSettings: BeautySettings): Partial<BeautyEffectSettings> => {
        return {
            whitening: apiSettings['Branquear'] || 0,
            smoothing: apiSettings['Alisar a pele'] || 0,
            saturation: apiSettings['Ruborizar'] || 0,
            contrast: apiSettings['Contraste'] || 0,
            babyFace: apiSettings['Rosto Bebê'] || 0,
            teethWhitening: apiSettings['Clarear dentes'] || 0,
            wrinkleSmoothing: apiSettings['Suavizar rugas'] || 0,
            darkCircle: apiSettings['Clarear olheiras'] || 0,
            acneRemoval: apiSettings['Remover manchas'] || 0,
            shineReduction: apiSettings['Reduzir brilho'] || 0,
            whiteBalance: Number(apiSettings['Balanço de Branco']) || 0,
            sharpness: Number(apiSettings['Nitidez']) || 0,
            faceVolume3D: Number(apiSettings['Efeito 3D']) || 0,
            noiseReduction: Number(apiSettings['Limpar Chiado']) || 0
        };
    };

    const initializeBeautyProcessing = async () => {
        if (initializingRef.current) return;
        initializingRef.current = true;
        try {
            const video = activeVideoRef?.current;
            if (!video) return;

            const success = await videoProcessor.initialize(video);
            if (!success) return;

            const processedStream = videoProcessor.startProcessing();
            if (!processedStream) return;

            const { streamPublishService } = await import('../../services/streamPublishService');
            streamPublishService.setBeautyProcessedStream(processedStream);

            if (streamPublishService.isPublishing()) {
                await streamPublishService.updateBeautyTrack();
            }

            await beautyWebRTCIntegration.initialize(processedStream);
            beautyWebRTCIntegration.toggleBeauty();
        } catch (error) {
            console.error('❌ [BEAUTY_PANEL] Erro ao inicializar processamento:', error);
            addToast(ToastType.Error, "Falha ao inicializar efeitos de beleza.");
        } finally {
            initializingRef.current = false;
        }
    };

    const rebuildVideoCss = () => {
        const video = activeVideoRef?.current;
        if (!video) return;
        const processed = videoProcessor.getProcessedStream();
        if (processed && video.srcObject === processed) {
            video.style.filter = 'none';
            return;
        }
        const parts: string[] = [];
        if (baseFilterRef.current && baseFilterRef.current !== 'none') {
            parts.push(baseFilterRef.current);
        }
        Object.values(effectCssRef.current).forEach((f) => parts.push(f));
        video.style.filter = parts.length ? parts.join(' ') : 'none';
    };

    const applyEffectToVideo = (effectName: string, intensity: number) => {
        const video = activeVideoRef?.current;
        if (!video) return;

        const effectMap: Record<string, (int: number) => string> = {
            'Branquear': (int) => `brightness(${1 + (int / 180)})`,
            'Alisar a pele': (int) => `contrast(${1 - (int / 1200)}) brightness(${1 + (int / 1500)}) blur(${Math.min(int / 140, 0.75)}px)`,
            'Ruborizar': (int) => `saturate(${1 + (int / 120)})`,
            'Nitidez': (int) => `contrast(${1 + (int / 180)})`,
            'Limpar Chiado': (int) => `blur(${Math.min(int / 160, 0.8)}px)`
        };

        const fn = effectMap[effectName];
        if (!fn) return;
        if (intensity <= 0) {
            delete effectCssRef.current[effectName];
        } else {
            effectCssRef.current[effectName] = fn(intensity);
        }
        rebuildVideoCss();
    };

    // 💾 Salvar no BANCO (debounced) — junto com os padrões escondidos para a
    // live continuar limpa/jovem/nítida mesmo salvando só o básico.
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
                api.updateBeautySettings(currentUser.id, completeSettings)
                    .then(() => {})
                    .catch(err => {
                        console.error('❌ [BEAUTY_PANEL] Erro ao salvar configurações:', err);
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

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        const newSettings = {
            ...settings,
            [selectedEffect]: value
        };
        setSettings(newSettings);
        saveSettings(newSettings);

        videoProcessor.updateBeautySettings(convertSettingsToBeautySettings(newSettings));
        applyEffectToVideo(selectedEffect, value);
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

        videoProcessor.updateBeautySettings(convertSettingsToBeautySettings(resetSettings));

        const video = activeVideoRef?.current;
        if (video) {
            video.style.filter = 'none';
            effectCssRef.current = {};
            baseFilterRef.current = '';
        }
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

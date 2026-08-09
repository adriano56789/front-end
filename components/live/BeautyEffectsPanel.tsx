import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon } from '../icons';
import { api } from '../../services/api';
import { BeautySettings, User, ToastType } from '../../types';
import { videoProcessor, BeautyEffectSettings } from '../../services/VideoProcessor';
import { beautyWebRTCIntegration } from '../../services/BeautyWebRTCIntegration';

// Custom SVGs for Beauty Effects (Pixel Perfect match with screenshot)
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

const BlushIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="blushGlow" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#ffb1b1" />
        <stop offset="50%" stopColor="#e11d48" />
        <stop offset="100%" stopColor="#4c0519" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="20" fill="url(#blushGlow)" stroke="#f43f5e" strokeWidth="1.5" />
    <path d="M42 22C46 27 46 37 42 42C38 38 38 26 42 22Z" fill="white" fillOpacity="0.25" />
  </svg>
);

const ContrastIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2.5" />
    <path d="M32 12C21 12 21 52 32 52V12Z" fill="currentColor" />
  </svg>
);

const BabyFaceIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8C19.5 8 10 17.5 10 30C10 42.5 19.5 56 32 56C44.5 56 54 42.5 54 30C54 17.5 44.5 8 32 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 26C24.5 27.5 26.5 27.5 28 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M36 26C37.5 27.5 39.5 27.5 41 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M27 37C29 39.5 35 39.5 37 37" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="22" cy="33" r="2.5" fill="#fda4af" />
    <circle cx="42" cy="33" r="2.5" fill="#fda4af" />
    <path d="M32 12C32 12 28 16 28 19C28 21 30 22 32 22C34 22 36 21 36 19C36 16 32 12 32 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LockIconCustom = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const filterImages: Record<string, string> = {
  'Musa': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&h=150&q=80',
  'Bonito': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80',
  'Vitalidade': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
  'Natural': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
  'Doce': 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&h=150&q=80',
  'Frio': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'Retrô': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80',
  'Película': 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=150&h=150&q=80',
  'Suave': 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=150&h=150&q=80',
  'Noite': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
};

const renderEffectIcon = (effectName: string, isSelected: boolean) => {
    const iconClass = `w-7 h-7 transition-all duration-300 ${isSelected ? 'text-[#a855f7] drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-gray-400'}`;
    switch (effectName) {
        case 'Branquear':
            return <WhitenIcon className={iconClass} />;
        case 'Alisar a pele':
            return <SmoothIcon className={iconClass} />;
        case 'Ruborizar':
            return <BlushIconPropsWrapper isSelected={isSelected} />;
        case 'Contraste':
            return <ContrastIcon className={iconClass} />;
        case 'Rosto Bebê':
            return <BabyFaceIcon className={iconClass} />;
        default:
            return <div className="text-xl">✨</div>;
    }
};

const BlushIconPropsWrapper: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
    return <BlushIcon className={isSelected ? 'w-7 h-7 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'w-7 h-7 opacity-75'} />;
};

interface BeautyEffectsPanelProps {
    onClose: () => void;
    currentUser: User;
    addToast: (type: ToastType, message: string) => void;
    videoRef?: React.RefObject<HTMLVideoElement | null>;
}

interface BeautyEffect {
  name: string;
  icon?: string;
  img?: string;
}

interface BeautyEffectsData {
  filters: BeautyEffect[];
  effects: BeautyEffect[];
}

const BeautyEffectsPanel: React.FC<BeautyEffectsPanelProps> = ({ onClose, currentUser, addToast, videoRef }) => {
    const [activeTab, setActiveTab] = useState<'Beleza' | 'Recomendar'>('Beleza');
    const [selectedFilter, setSelectedFilter] = useState('Musa');
    const [selectedEffect, setSelectedEffect] = useState('Branquear');
    const [settings, setSettings] = useState<BeautySettings>({});
    const [effectsData, setEffectsData] = useState<BeautyEffectsData>({ filters: [], effects: [] });
    const [isLoading, setIsLoading] = useState(true);
    const saveTimeout = useRef<number | null>(null);
    const currentFilters = useRef<string>('');
    const initializingRef = useRef(false);

    // Fallback automatic calculation to locate the local video preview if videoRef is not provided
    const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
        if (!videoRef?.current) {
            const videoEl = document.querySelector('video');
            if (videoEl) {
                fallbackVideoRef.current = videoEl;
                console.log('✅ [BEAUTY_PANEL] Fallback video element resolved via DOM query');
            }
        }
    }, [videoRef]);

    const activeVideoRef = videoRef || fallbackVideoRef;

    // Fetch static effects definitions
    useEffect(() => {
        api.getBeautyEffects().then((response: any) => {
            // Lidar com a nova estrutura da API: { data: { filters, effects } }
            const data = response?.data || response;
            setEffectsData({
                filters: data?.filters || [],
                effects: data?.effects || []
            });
        }).catch(err => {
            console.error('❌ [BEAUTY_PANEL] Erro ao buscar efeitos:', err);
        });
    }, []);

    // Fetch user's saved settings
    useEffect(() => {
        if (currentUser?.id) {
            setIsLoading(true);
            api.getBeautySettings(currentUser.id)
                .then(data => {
                    setSettings(data || {});
                    
                    // Carregar estado completo do painel
                    if (data?.activeTab) {
                        setActiveTab(data.activeTab);
                    }
                    if (data?.selectedFilter) {
                        setSelectedFilter(data.selectedFilter);
                    }
                    if (data?.selectedEffect) {
                        setSelectedEffect(data.selectedEffect);
                    }
                    
                    // Aplicar configurações salvas ao processador de vídeo
                    const beautySettings = convertSettingsToBeautySettings(data || {});
                    videoProcessor.updateBeautySettings(beautySettings);
                    
                    // Iniciar processamento se ainda não estiver ativo
                    if (activeVideoRef?.current && !beautyWebRTCIntegration.isBeautyActive()) {
                        initializeBeautyProcessing();
                    }

                    // Aplicar os filtros CSS iniciais para visualização em tempo real do host
                    if (data?.selectedFilter && data.selectedFilter !== 'Fechar') {
                        applyFilterToVideo(data.selectedFilter);
                    } else {
                        // Se não tem filtro selecionado, aplicar efeitos individuais
                        Object.entries(data || {}).forEach(([effectName, val]) => {
                            if (typeof val === 'number') {
                                applyEffectToVideo(effectName, val);
                            }
                        });
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch beauty settings:", err);
                    addToast(ToastType.Error, "Não foi possível carregar os efeitos de beleza.");
                })
                .finally(() => setIsLoading(false));
        }
    }, [currentUser, addToast, activeVideoRef]);

    // Inicializar processamento de beleza quando o painel abrir
    useEffect(() => {
        if (activeVideoRef?.current && currentUser?.id) {
            initializeBeautyProcessing();
        }
    }, [activeVideoRef, currentUser]);

    // Converter configurações do formato da API para o formato do VideoProcessor
    const convertSettingsToBeautySettings = (apiSettings: BeautySettings): BeautyEffectSettings => {
        return {
            whitening: apiSettings['Branquear'] || 0,
            smoothing: apiSettings['Alisar a pele'] || 0,
            saturation: apiSettings['Ruborizar'] || 0,
            contrast: apiSettings['Contraste'] || 0,
            babyFace: apiSettings['Rosto Bebê'] || 0
        };
    };

    // Inicializar processamento de beleza e conectar ao pipeline de publicação
    const initializeBeautyProcessing = async () => {
        if (initializingRef.current) return;
        initializingRef.current = true;
        try {
            const video = activeVideoRef?.current;
            if (!video) return;

            // Inicializar processador de vídeo com o elemento de vídeo da câmera
            const success = await videoProcessor.initialize(video);
            if (!success) {
                console.warn('[BEAUTY_PANEL] VideoProcessor não conseguiu inicializar, usando CSS filters como fallback');
                return;
            }

            // Iniciar processamento — retorna stream com efeitos aplicados via WebGL
            const processedStream = videoProcessor.startProcessing();
            if (!processedStream) {
                console.warn('[BEAUTY_PANEL] processedStream é nulo');
                return;
            }

            // 🔥 CONECTAR AO PIPELINE DE PUBLICAÇÃO: o streamPublishService usará este stream
            // para substituir a track de vídeo original pela processada
            const { streamPublishService } = await import('../../services/streamPublishService');
            streamPublishService.setBeautyProcessedStream(processedStream);

            // Se já estiver publicando, substituir a track dinamicamente
            if (streamPublishService.isPublishing()) {
                await streamPublishService.updateBeautyTrack();
            }

            // Configurar integração com WebRTC
            await beautyWebRTCIntegration.initialize(processedStream);
            beautyWebRTCIntegration.toggleBeauty(); // Ativar beleza

            console.log('✅ [BEAUTY_PANEL] Processamento WebGL ativo e conectado à publicação');
            
        } catch (error) {
            console.error('❌ [BEAUTY_PANEL] Erro ao inicializar processamento:', error);
            addToast(ToastType.Error, "Falha ao inicializar efeitos de beleza.");
        } finally {
            initializingRef.current = false;
        }
    };

    // Função para aplicar efeitos CSS diretamente no vídeo com filtragem suave profissional
    const applyEffectToVideo = (effectName: string, intensity: number) => {
        const video = activeVideoRef?.current;
        if (!video) return;

        let filterString = currentFilters.current;

        // Mapeamento profissional e calibrado dos efeitos para filtros CSS de alta performance
        const effectMap: Record<string, (int: number) => string> = {
            'Branquear': (int) => `brightness(${1 + (int / 180)})`,
            'Alisar a pele': (int) => `contrast(${1 - (int / 1200)}) brightness(${1 + (int / 1500)}) blur(${Math.min(int / 140, 0.75)}px)`,
            'Ruborizar': (int) => `saturate(${1 + (int / 120)})`,
            'Contraste': (int) => `contrast(${1 + (int / 250)})`
        };

        if (effectMap[effectName]) {
            const newFilter = effectMap[effectName](intensity);
            
            // Remover filtro existente do mesmo tipo
            const filterParts = filterString.split(' ').filter(part => 
                !part.includes('brightness') && !part.includes('blur') && 
                !part.includes('saturate') && !part.includes('contrast')
            );
            
            filterParts.push(newFilter);
            filterString = filterParts.join(' ');
        }

        video.style.filter = filterString;
        currentFilters.current = filterString;
    };

    // Função para aplicar filtro pré-definido com visual refinado
    const applyFilterToVideo = (filterName: string) => {
        const video = activeVideoRef?.current;
        if (!video) return;

        const filterMap: Record<string, string> = {
            'Fechar': 'none',
            'Musa': 'brightness(1.1) saturate(1.15) contrast(1.05)',
            'Bonito': 'brightness(1.12) saturate(1.1) contrast(1.08)',
            'Vitalidade': 'brightness(1.15) saturate(1.22) contrast(1.1)',
            'Natural': 'brightness(1.05) saturate(1.05) contrast(1.02)',
            'Doce': 'brightness(1.08) saturate(1.18) contrast(1.0) hue-rotate(10deg)',
            'Frio': 'brightness(1.05) saturate(0.88) contrast(1.12) sepia(0.04) hue-rotate(15deg)',
            'Retrô': 'brightness(1.0) saturate(0.75) contrast(1.15) sepia(0.25)',
            'Película': 'brightness(1.08) saturate(1.05) contrast(1.25) sepia(0.12)',
            'Suave': 'brightness(1.12) saturate(0.85) contrast(0.92) blur(0.3px)',
            'Noite': 'brightness(1.2) saturate(1.1) contrast(1.15)'
        };

        const filterString = filterMap[filterName] || 'none';
        video.style.filter = filterString;
        currentFilters.current = filterString;
    };

    // Debounced save function
    const saveSettings = (newSettings: BeautySettings) => {
        if (saveTimeout.current) {
            clearTimeout(saveTimeout.current);
        }
        saveTimeout.current = window.setTimeout(() => {
            if (currentUser?.id) {
                // Incluir estado completo do painel
                const completeSettings: BeautySettings = {
                    ...newSettings,
                    activeTab,
                    selectedFilter,
                    selectedEffect
                };
                
                api.updateBeautySettings(currentUser.id, completeSettings)
                    .then(() => {
                        // Success - no sensitive data logged
                    })
                    .catch(err => {
                        console.error('❌ [BEAUTY_PANEL] Erro ao salvar configurações:', err);
                        addToast(ToastType.Error, "Falha ao salvar o efeito.");
                    });
            }
        }, 500);
    };

    // Cleanup timeout on unmount
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
        
        // Aplicar efeito em tempo real no processador de vídeo WebGL (transmissão)
        const beautySettings = convertSettingsToBeautySettings(newSettings);
        videoProcessor.updateBeautySettings(beautySettings);
        
        // "Rosto Bebê" não tem equivalente em CSS — o warp acontece no processador WebGL
        if (selectedEffect !== 'Rosto Bebê') {
            // Sempre aplicar efeitos CSS ao vídeo local para feedback imediato e impecável na tela do broadcaster
            applyEffectToVideo(selectedEffect, value);
        }
    };

    // Handler para seleção de filtros (Recomendar)
    const handleFilterSelect = (filterName: string) => {
        setSelectedFilter(filterName);
        
        // Configurações para filtros pré-definidos
        const filterSettings: Record<string, Partial<BeautyEffectSettings>> = {
            'Fechar': { whitening: 0, smoothing: 0, saturation: 0, contrast: 0 },
            'Musa': { whitening: 10, smoothing: 15, saturation: 20, contrast: 5 },
            'Bonito': { whitening: 15, smoothing: 20, saturation: 10, contrast: 10 },
            'Vitalidade': { whitening: 20, smoothing: 10, saturation: 30, contrast: 15 },
            'Natural': { whitening: 5, smoothing: 8, saturation: 5, contrast: 3 },
            'Doce': { whitening: 12, smoothing: 25, saturation: 25, contrast: 2 },
            'Frio': { whitening: 0, smoothing: 10, saturation: -10, contrast: 12 },
            'Retrô': { whitening: 0, smoothing: 5, saturation: -15, contrast: 20 },
            'Película': { whitening: 8, smoothing: 12, saturation: 8, contrast: 25 },
            'Suave': { whitening: 15, smoothing: 30, saturation: -5, contrast: -5 },
            'Noite': { whitening: 25, smoothing: 5, saturation: 15, contrast: 20 }
        };
        
        const selectedSettings = filterSettings[filterName] || filterSettings['Fechar'];
        
        // Converter para o formato da API
        const apiSettings: BeautySettings = {};
        if (selectedSettings.whitening > 0) apiSettings['Branquear'] = selectedSettings.whitening;
        if (selectedSettings.smoothing > 0) apiSettings['Alisar a pele'] = selectedSettings.smoothing;
        if (selectedSettings.saturation > 0) apiSettings['Ruborizar'] = selectedSettings.saturation;
        if (selectedSettings.contrast > 0) apiSettings['Contraste'] = selectedSettings.contrast;
        
        // Salvar o filtro selecionado
        apiSettings['selectedFilter'] = filterName;
        
        // Salvar na API
        saveSettings(apiSettings);
        
        // Sincronizar tanto WebGL quanto render local (preservando "Rosto Bebê")
        videoProcessor.updateBeautySettings({ ...selectedSettings, babyFace: settings['Rosto Bebê'] || 0 });
        applyFilterToVideo(filterName);
    };

    // Handler para seleção de efeitos (Beleza)
    const handleEffectSelect = (effectName: string) => {
        setSelectedEffect(effectName);
        
        // Salvar estado completo
        const completeSettings: BeautySettings = {
            ...settings,
            activeTab,
            selectedFilter,
            selectedEffect: effectName
        };
        saveSettings(completeSettings);
    };

    const resetEffects = () => {
        const defaultSettings: BeautySettings = effectsData.effects.reduce((acc, effect) => {
            acc[effect.name] = effect.name === 'Rosto Bebê' ? 0 : 20; // Defaulting to 20
            return acc;
        }, {} as BeautySettings);
        
        setSettings(defaultSettings);
        saveSettings(defaultSettings);
        setSelectedFilter('Musa');
        setSelectedEffect('Branquear');
        
        // Resetar processador de vídeo WebGL
        videoProcessor.updateBeautySettings({
            whitening: 0,
            smoothing: 0,
            saturation: 0,
            contrast: 0,
            babyFace: 0
        });
        
        // Resetar vídeo (filtro CSS local)
        const video = activeVideoRef?.current;
        if (video) {
            video.style.filter = 'none';
            currentFilters.current = '';
        }
    };
    
    const currentEffectValue = settings[selectedEffect] ?? 0;

    return (
         <div className="absolute inset-x-0 bottom-0 bg-[#0c0c0f] border-t border-white/5 rounded-t-[28px] z-50 p-5 pb-7 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            {/* Header Tabs Row */}
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center space-x-6">
                    <button 
                        onClick={() => {
                            setActiveTab('Recomendar');
                            const completeSettings: BeautySettings = {
                                ...settings,
                                activeTab: 'Recomendar',
                                selectedFilter,
                                selectedEffect
                            };
                            saveSettings(completeSettings);
                        }} 
                        className={`transition-colors font-sans text-[15px] ${activeTab === 'Recomendar' ? 'text-white font-extrabold tracking-wide' : 'text-[#717175] font-semibold hover:text-white'}`}
                    >
                        Recomendar
                    </button>
                    <button 
                        onClick={() => {
                            setActiveTab('Beleza');
                            const completeSettings: BeautySettings = {
                                ...settings,
                                activeTab: 'Beleza',
                                selectedFilter,
                                selectedEffect
                            };
                            saveSettings(completeSettings);
                        }} 
                        className={`transition-colors font-sans text-[15px] ${activeTab === 'Beleza' ? 'text-white font-extrabold tracking-wide' : 'text-[#717175] font-semibold hover:text-white'}`}
                    >
                        Beleza
                    </button>
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

            {/* Filter Presets Row — scrollable horizontal carousel */}
            {activeTab === 'Recomendar' && (
                <div className="overflow-x-auto no-scrollbar mb-5 pt-1 pb-2 -mx-1 px-1">
                    <div className="flex gap-3 min-w-max px-0.5">
                        {effectsData.filters.map(f => {
                            const isSelected = selectedFilter === f.name;
                            const isFechar = f.name === 'Fechar';
                            return (
                                <button 
                                    key={f.name} 
                                    onClick={() => handleFilterSelect(f.name)} 
                                    className="flex flex-col items-center space-y-2 focus:outline-none group shrink-0"
                                >
                                    {isFechar ? (
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-[#242428] border border-white/5 transition-all duration-300 ${isSelected ? 'ring-[2.5px] ring-[#a855f7] ring-offset-2 ring-offset-[#0c0c0f] scale-105 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'hover:border-white/10'}`}>
                                            <LockIconCustom className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                                        </div>
                                    ) : (
                                        <img 
                                            src={filterImages[f.name] || f.img || `https://picsum.photos/seed/${f.name}/150/150`} 
                                            alt={f.name} 
                                            className={`w-12 h-12 rounded-full object-cover transition-all duration-300 ${isSelected ? 'ring-[2.5px] ring-[#a855f7] ring-offset-2 ring-offset-[#0c0c0f] scale-105 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'opacity-80 group-hover:opacity-100'}`} 
                                        />
                                    )}
                                    <span className={`text-[10px] transition-colors whitespace-nowrap ${isSelected ? 'text-white font-extrabold' : 'text-[#a1a1aa] group-hover:text-white'}`} translate="no">
                                        {f.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Slider Section (Always present at bottom adjustments) */}
            <div className="flex items-center space-x-4 mb-4 px-1.5 mt-2">
                <span className="text-[#a855f7] font-sans font-black text-base w-7 text-center shrink-0">
                    {currentEffectValue}
                </span>
                <div className="relative flex-1 flex items-center h-5">
                    {/* Background track */}
                    <div className="absolute left-0 right-0 h-[3px] bg-[#242428] rounded-full" />
                    {/* Progress track */}
                    <div 
                        className="absolute left-0 h-[3px] bg-[#a855f7] rounded-full" 
                        style={{ width: `${currentEffectValue}%` }}
                    />
                    {/* Invisible Input slider overlay with custom styled thumb */}
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

            {/* Custom Beauty Adjustments ("Beleza" effects list) - Always at the bottom per screenshot */}
            <div className="flex justify-around items-center text-center mt-4">
                {effectsData.effects.map((e) => {
                    const isSelected = selectedEffect === e.name;
                    return (
                         <button 
                            key={e.name} 
                            onClick={() => handleEffectSelect(e.name)} 
                            className="flex flex-col items-center space-y-2.5 focus:outline-none group"
                         >
                            <div className={`w-[72px] h-[72px] rounded-[18px] flex items-center justify-center transition-all duration-300 relative ${isSelected ? 'bg-[#201d2a]/60 border-[2.5px] border-[#a552f4] shadow-[0_0_15px_rgba(168,85,247,0.25)] scale-105' : 'bg-[#1b1b1f] border border-white/5 hover:border-white/10 group-hover:scale-102'}`}>
                                {renderEffectIcon(e.name, isSelected)}
                            </div>
                            <span className={`text-[11px] font-sans font-medium transition-colors ${isSelected ? 'text-white font-bold' : 'text-[#a1a1aa] group-hover:text-white'}`} translate="no">
                                {e.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BeautyEffectsPanel;

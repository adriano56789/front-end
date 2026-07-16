
import React, { useRef, useEffect, useState } from 'react';
import { GiftPayload } from './GiftAnimationOverlay';
import { Gift } from '../../types';
import GiftEffectCanvas from './GiftEffectCanvas';
import { giftCacheService } from '../../services/GiftCacheService';

// Helper para classes de animação CSS
const getAnimationClass = (gift: Gift): string => {
    const nameMap: Record<string, string> = {
        'Foguete': 'gift-anim-foguete',
        'Jato Privado': 'gift-anim-jato-privado',
        'Anel': 'gift-anim-anel',
        'Leão': 'gift-anim-leao',
        'Carro': 'gift-anim-carro',
        'Carro Esportivo': 'gift-anim-carro',
        'Fênix': 'gift-anim-fenix',
        'Supercarro': 'gift-anim-supercarro',
        'Dragão': 'gift-anim-dragao',
        'Castelo': 'gift-anim-castelo',
        'Universo': 'gift-anim-universo',
        'Helicóptero': 'gift-anim-helicoptero',
        'Planeta': 'gift-anim-planeta',
        'Iate': 'gift-anim-iate',
        'Galáxia': 'gift-anim-galaxia',
        'Coroa Real': 'gift-anim-coroa-real',
        'Diamante VIP': 'gift-anim-diamante-vip',
        'Ilha Particular': 'gift-anim-ilha-particular',
        'Cavalo Alado': 'gift-anim-cavalo-alado',
        'Tigre Dourado': 'gift-anim-tigre-dourado',
        'Nave Espacial': 'gift-anim-nave-espacial',
        'Coração': 'gift-anim-coracao',
        'Café': 'gift-anim-cafe'
    };
    
    if (nameMap[gift.name]) {
        return nameMap[gift.name];
    }
    // Animação padrão "Pop Shake Glow" para presentes menores
    return 'gift-anim-pop-shake-glow';
};

const getSoundUrl = (_giftName: string): string => {
    return '';
};

// Alta fidelidade de efeitos audiovisuais premium (TikTok Live Gifts Style)
// Mapeamento de efeitos com canais transparentes ou blend-screen integrados e sons originais sincronizados
interface LuxuryAsset {
    videoSrc: string;
    audioSrc: string;
    duration: number;
    glowColor: string;
    noBlend?: boolean;
}

const LUXURY_ASSETS_MAP: Record<string, LuxuryAsset> = {
    'Foguete': { videoSrc: '', audioSrc: '', duration: 5500, glowColor: 'rgba(234, 179, 8, 0.85)' },
    'Jato Privado': { videoSrc: '', audioSrc: '', duration: 5000, glowColor: 'rgba(56, 189, 248, 0.8)' },
    'Anel': { videoSrc: '', audioSrc: '', duration: 4500, glowColor: 'rgba(167, 139, 250, 0.85)' },
    'Carro': { videoSrc: '', audioSrc: '', duration: 5000, glowColor: 'rgba(239, 68, 68, 0.85)', noBlend: true },
    'Carro Esportivo': { videoSrc: '', audioSrc: '', duration: 5000, glowColor: 'rgba(239, 68, 68, 0.85)', noBlend: true },
    'Fênix': { videoSrc: '', audioSrc: '', duration: 6000, glowColor: 'rgba(249, 115, 22, 0.9)' },
    'Leão': { videoSrc: '', audioSrc: '', duration: 5500, glowColor: 'rgba(234, 179, 8, 0.9)' },
    'Supercarro': { videoSrc: '', audioSrc: '', duration: 5000, glowColor: 'rgba(168, 85, 247, 0.85)', noBlend: true },
    'Dragão': { videoSrc: '', audioSrc: '', duration: 6000, glowColor: 'rgba(34, 197, 94, 0.85)' },
    'Castelo': { videoSrc: '', audioSrc: '', duration: 6000, glowColor: 'rgba(250, 204, 21, 0.85)' },
    'Iate': { videoSrc: '', audioSrc: '', duration: 6000, glowColor: 'rgba(14, 165, 233, 0.85)' },
    'Galáxia': { videoSrc: '', audioSrc: '', duration: 6500, glowColor: 'rgba(236, 72, 153, 0.85)' },
    'Coroa Real': { videoSrc: '', audioSrc: '', duration: 5500, glowColor: 'rgba(234, 179, 8, 0.85)' },
    'Explosão de Confete': { videoSrc: '', audioSrc: '', duration: 5000, glowColor: 'rgba(234, 179, 8, 0.85)' },
    'Portal Galáctico': { videoSrc: '', audioSrc: '', duration: 6000, glowColor: 'rgba(139, 92, 246, 0.9)' },
    'Invocação de Dragão': { videoSrc: '', audioSrc: '', duration: 6500, glowColor: 'rgba(16, 185, 129, 0.85)' },
    'Coração Gigante': { videoSrc: '', audioSrc: '', duration: 5000, glowColor: 'rgba(244, 63, 94, 0.85)' },
    'Beijo de Anjo': { videoSrc: '', audioSrc: '', duration: 4800, glowColor: 'rgba(251, 113, 133, 0.85)' },
    'Show de Luzes': { videoSrc: '', audioSrc: '', duration: 5200, glowColor: 'rgba(34, 211, 238, 0.85)' },
    'Chuva de Rosas': { videoSrc: '', audioSrc: '', duration: 5500, glowColor: 'rgba(239, 68, 68, 0.85)' },
    'Entrada de Carro de Luxo': { videoSrc: '', audioSrc: '', duration: 5000, glowColor: 'rgba(234, 179, 8, 0.85)', noBlend: true },
    'Entrada Fênix de Fogo': { videoSrc: '', audioSrc: '', duration: 6000, glowColor: 'rgba(249, 115, 22, 0.9)' }
};

const getFallbackAsset = (gift: Gift): LuxuryAsset => {
    const isGold = gift.category === 'VIP' || gift.category === 'Luxo';
    return {
        videoSrc: '',
        audioSrc: '',
        duration: 4500,
        glowColor: isGold ? 'rgba(234, 179, 8, 0.8)' : 'rgba(168, 85, 247, 0.75)'
    };
};

const FullScreenGiftAnimation: React.FC<{ payload: GiftPayload | null; onEnd: () => void; }> = ({ payload, onEnd }) => {
    const animationTimeoutRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [resolvedVideo, setResolvedVideo] = useState<string>('');
    const [resolvedAudio, setResolvedAudio] = useState<string>('');
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    
    // NOVO: Referência mutável para evitar stale closures
    const onEndRef = useRef(onEnd);

    // Mantém a referência sempre atualizada com a última função recebida por props
    useEffect(() => {
        onEndRef.current = onEnd;
    }, [onEnd]);

    // Efeito para preparar os assets (preload de verdade) antes de começar
    useEffect(() => {
        if (!payload || !payload.gift) {
            setResolvedVideo('');
            setResolvedAudio('');
            setIsLoaded(false);
            return;
        }

        const { gift } = payload;
        const assetConfig = LUXURY_ASSETS_MAP[gift.name] || getFallbackAsset(gift);
        const videoUrl = gift.animationUrl || gift.videoUrl || assetConfig.videoSrc;
        const audioUrl = gift.audioUrl || assetConfig.audioSrc || getSoundUrl(gift.name);

        let active = true;
        const t0 = performance.now();

        async function prepareAssets() {
            try {
                // Resolvendo de forma ultra rápida pelo cache local
                const [cachedVideo, cachedAudio] = await Promise.all([
                    giftCacheService.getCachedOrFetch(videoUrl),
                    giftCacheService.getCachedOrFetch(audioUrl)
                ]);

                if (active) {
                    const elapsed = performance.now() - t0;
                    console.log(`[GiftPlayerPool] Prepared assets in ${elapsed.toFixed(1)}ms. Hit play!`);
                    setResolvedVideo(cachedVideo);
                    setResolvedAudio(cachedAudio);
                    setIsLoaded(true);
                }
            } catch (err) {
                console.error("[GiftPlayerPool] Preparação de vídeo falhou:", err);
                if (active) {
                    // Fallback para urls de rede convencionais se der erro
                    setResolvedVideo(videoUrl);
                    setResolvedAudio(audioUrl);
                    setIsLoaded(true);
                }
            }
        }

        prepareAssets();

        return () => {
            active = false;
        };
    }, [payload]);

    // Efeito para iniciar som e timer de encerramento do espetáculo, somente após assets prontos
    useEffect(() => {
        const cleanup = () => {
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
                animationTimeoutRef.current = null;
            }
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
        cleanup();

        if (!payload || !payload.gift || !isLoaded || !resolvedAudio) {
            return;
        }

        const { gift } = payload;
        const assetConfig = LUXURY_ASSETS_MAP[gift.name] || getFallbackAsset(gift);

        // Tocar som em sincronia pura com áudio preloaded
        try {
            const audio = new Audio(resolvedAudio);
            audio.volume = 0.65; // Volume reforçado do espetáculo
            audioRef.current = audio;
            audio.play().catch(e => {
                // Silenciosamente ignorar erro de autoplay
            });
        } catch (error) {
            console.warn("[GiftPlayerPool] Som não pôde tocar:", error);
        }

        // Determinar a duração total da reprodução audiovisual
        const duration = Number(gift.duration || assetConfig.duration || 5000);

        animationTimeoutRef.current = window.setTimeout(() => {
            onEndRef.current();
        }, duration);

        return cleanup;
    }, [payload, isLoaded, resolvedAudio]);

    if (!payload || !payload.gift || !isLoaded) return null;
    
    const { gift, fromUser, quantity } = payload;
    const assetConfig = LUXURY_ASSETS_MAP[gift.name] || getFallbackAsset(gift);
    const uniqueKey = payload.id ? `gift-fs-${payload.id}` : `gift-fs-${Date.now()}`;

    return (
        <div 
            key={uniqueKey} 
            className="fixed inset-0 z-[9990] flex flex-col items-center justify-center pointer-events-none bg-black/10 backdrop-blur-[1px] animate-gift-screen-container"
        >
            {/* 1. Canvas de Partículas (Sempre reproduzindo fluxos mágicos complementares) */}
            <GiftEffectCanvas key={`canvas-${uniqueKey}`} gift={gift} />

            {/* 2. Reprodutor de Vídeo Translúcido / Multimídia Avançado (Estilo AR / TikTok Live overlays) */}
            <div className="flex flex-col items-center justify-center relative z-10 w-full h-full max-w-4xl px-4 select-none">
                
                {/* Efeito Glow Neon no fundo da visualização */}
                <div 
                    className="absolute w-72 h-72 rounded-full blur-[80px] opacity-40 animate-pulse scale-125"
                    style={{ backgroundColor: assetConfig.glowColor }}
                />

                {/* Reprodutor de vídeo com canal de mesclagem ou renderização direta elegante para vídeos reais */}
                <div className={`relative flex items-center justify-center ${gift.noBlend || (gift.noBlend === undefined && assetConfig.noBlend) ? 'w-[480px] h-[270px] aspect-video border-[4px] border-[#FFD700] rounded-[24px] overflow-hidden bg-black/95 shadow-[0_0_60px_rgba(255,215,0,0.45)]' : 'w-[450px] h-[450px]'} transform animate-gift-pop-impact`}>
                    <video 
                        src={resolvedVideo || undefined}
                        autoPlay 
                        loop={false}
                        muted 
                        playsInline 
                        className={`w-full h-full ${gift.noBlend || (gift.noBlend === undefined && assetConfig.noBlend) ? 'object-cover' : 'object-contain mix-blend-screen'} filter drop-shadow-[0_0_25px_rgba(234,179,8,0.7)]`}
                        style={{ transform: 'none' }}
                        onPlay={(e) => {
                            // Garantir que roda a 1x de velocidade
                            (e.target as HTMLVideoElement).playbackRate = 1.0;
                        }}
                    />

                    {/* Ícone ou componente SVG flutuando centralizado no coração do espetáculo de partículas - Ocultado se houver vídeo nativo exclusivo */}
                    {!(gift.animationUrl || LUXURY_ASSETS_MAP[gift.name] || gift.videoUrl) && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none transform animate-gift-bounce-subtle">
                            {gift.component ? (
                                React.cloneElement(gift.component as React.ReactElement<any>, { 
                                    className: "w-28 h-28 filter drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]" 
                                })
                            ) : (
                                <span className="text-8rem filter drop-shadow-[0_0_25px_rgba(255,215,0,0.85)] select-none">
                                    {gift.icon}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Banners de Texto Enormes e Brilhantes com efeito carrossel e carinho */}
                <div className="mt-4 text-center z-20 flex flex-col items-center space-y-1 transform animate-gift-text-bounce">
                    <div className="flex items-center space-x-2 bg-black/60 px-5 py-2.5 rounded-full border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-md">
                        <img 
                            src={fromUser.avatarUrl || `https://picsum.photos/seed/${fromUser.id}/150/150.jpg`} 
                            alt={fromUser.name} 
                            className="w-7 h-7 rounded-full border border-yellow-400 object-cover" 
                        />
                        <span className="text-sm font-extrabold text-white tracking-wide">
                            {fromUser.name}
                        </span>
                        <span className="text-xs font-semibold text-zinc-300">
                            enviou
                        </span>
                        <span className="text-sm font-black text-yellow-300 antialiased italic">
                            {gift.name}
                        </span>
                    </div>

                    <div className="mt-3.5 flex items-center space-x-1 justify-center animate-pulse">
                        <span className="text-[#FFD700] text-3xl font-black italic tracking-tighter drop-shadow-lg text-glow-ultimate pr-1">
                            X {quantity}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-white/50 tracking-widest bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                            Presente de Luxo
                        </span>
                    </div>
                </div>
            </div>
            
            {/* CSS Global Embebido para Transições Fluídas e Pulsos Tridimensionais */}
            <style>{`
                @keyframes gift-screen-container-fade {
                    0% { opacity: 0; }
                    12% { opacity: 1; }
                    88% { opacity: 1; filter: blur(0); }
                    100% { opacity: 0; filter: blur(12px); }
                }
                @keyframes gift-pop-impact {
                    0% { transform: scale(0.35) rotate(-15deg); opacity: 0; }
                    15% { transform: scale(1.15) rotate(5deg); opacity: 1; }
                    22% { transform: scale(0.95) rotate(-2deg); }
                    30% { transform: scale(1); rotate(0deg); }
                }
                @keyframes gift-bounce-subtle {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-15px) scale(1.08); }
                }
                @keyframes gift-text-bounce-anim {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                .animate-gift-screen-container {
                    animation: gift-screen-container-fade 5.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-gift-pop-impact {
                    animation: gift-pop-impact 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                .animate-gift-bounce-subtle {
                    animation: gift-bounce-subtle 3s ease-in-out infinite;
                }
                .animate-gift-text-bounce {
                    animation: gift-text-bounce-anim 2.5s ease-in-out infinite;
                }

                .text-glow-ultimate {
                    text-shadow: 0 0 12px rgba(250, 204, 21, 0.8), 0 0 25px rgba(250, 204, 21, 0.4), 0 2px 4px rgba(0,0,0,0.9);
                }
            `}</style>
        </div>
    );
};

export default FullScreenGiftAnimation;

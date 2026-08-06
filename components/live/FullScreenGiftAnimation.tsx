
import React, { useRef, useEffect, useState } from 'react';
import { GiftPayload } from './GiftAnimationOverlay';
import { Gift } from '../../types';
import GiftEffectCanvas from './GiftEffectCanvas';
import GiftAlphaVideoPlayer from './GiftAlphaVideoPlayer';
import { giftCacheService } from '../../services/GiftCacheService';
import { getAnimationUrl } from '../../services/GiftAnimationUrls';

// ⏱ Duração REAL de cada arquivo de animação (medida com ffprobe):
//   Rosa de Cristal   (rosa_cristal.mp4)   = 5.000s
//   Champanhe Dourada (champanhe_dourado.mp4) = 4.033s
//   Anel de Ouro      (anel_de_ouro.mp4)   = 4.367s
// Usado como fallback quando a duração real ainda não foi carregada pelo
// metadata do vídeo (o tempo exato sempre vem do arquivo em execução).
const GIFT_ANIMATION_DURATIONS_MS: Record<string, number> = {
    'Rosa': 5000,
    'Champanhe': 4033,
    'Anel': 4367,
};

// 🎯 APENAS estes 3 presentes têm animação mp4 real (arquivos na pasta
// public/animations). NÃO usar getAnimationUrl genérico: ele também cobre
// outros gifts (.webm de /uploads/animations) que NÃO devem ir para o
// caminho de canvas — eles mantêm o efeito de partículas/ícone atual.
const GIFT_ANIMATION_NAMES = new Set(['Rosa', 'Champanhe', 'Anel']);

const hasRealAnimationFile = (gift: Gift): boolean => {
    return GIFT_ANIMATION_NAMES.has(gift.name);
};

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

// 🔊 Som dos presentes (gerados com ffmpeg — chimes sem royalties):
//   - /sounds/gift-luxury.mp3  → arpejo rico para presentes PREMIUM
//   - /sounds/gift-sparkle.mp3 → brilho curto para os demais
// Os mp4 de animação NÃO têm trilha de áudio, então o efeito sonoro é tocado
// em separado (FullScreenGiftAnimation → efeito de áudio), como TikTok Live.
const getSoundUrl = (giftName: string): string => {
    return LUXURY_ASSETS_MAP[giftName] ? '/sounds/gift-luxury.mp3' : '/sounds/gift-sparkle.mp3';
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

// 🚫 SEM VÍDEO: presente é 100% ANIMAÇÃO (ícone/componente SVG + partículas em
// canvas + brilho + banner) — como TikTok Live / Bigo / ZEGO fazem. Nenhum
// arquivo de vídeo (.mp4/.webm) é baixado nem reproduzido em tela cheia.
const LUXURY_ASSETS_MAP: Record<string, LuxuryAsset> = {
    'Foguete': { videoSrc: '', audioSrc: '', duration: 5500, glowColor: 'rgba(234, 179, 8, 0.85)' },
    'Jato Privado': { videoSrc: '', audioSrc: '', duration: 5000, glowColor: 'rgba(56, 189, 248, 0.8)' },
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
    'Rosa': { videoSrc: '', audioSrc: '', duration: 5500, glowColor: 'rgba(244, 63, 94, 0.85)' },
    'Champanhe': { videoSrc: '', audioSrc: '', duration: 4500, glowColor: 'rgba(234, 179, 8, 0.9)' },
    'Anel': { videoSrc: '', audioSrc: '', duration: 4500, glowColor: 'rgba(250, 204, 21, 0.9)' },
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

/**
 * 🎞️ Player de animação de presente com TRANSPARÊNCIA REAL.
 *
 * Os mp4 de presentes embutem o canal ALPHA no próprio frame (faixa esquerda
 * em escala de cinza) e o conteúdo RGB na faixa direita. O HTML5 player não
 * reconstrói essa transparência — por isso o GiftAlphaVideoPlayer desenha a
 * animação num <canvas> WebGL com shader que combina RGB + Alpha, deixando o
 * fundo preto invisível sobre a transmissão (mesmo efeito de TikTok Live /
 * Bigo Live). O <video> fica OCULTO no DOM — nenhum player aparece na tela.
 *
 * Reporta a duração REAL do arquivo via onDuration (onLoadedMetadata) para
 * que o timer de encerramento seja exatamente o tempo do vídeo.
 */
const FullScreenGiftAnimation: React.FC<{ payload: GiftPayload | null; onEnd: () => void; }> = ({ payload, onEnd }) => {
    const animationTimeoutRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [resolvedAudio, setResolvedAudio] = useState<string>('');
    // ⏱ Duração real do arquivo de animação (reportada pelo metadata do vídeo).
    const [realAnimDurationMs, setRealAnimDurationMs] = useState<number | null>(null);
    // NOVO: a animação NÃO espera o pré-load dos assets — renderiza na hora
    // (instante). 🚫 SEM VÍDEO: o presente exibe apenas a animação (partículas
    // + ícone + banner), nunca o arquivo de vídeo — isso é o comportamento correto.
    // NOVO: Referência mutável para evitar stale closures
    const onEndRef = useRef(onEnd);
    // 🔒 Guarda contra encerramento duplo: o timer (backup) e o evento `ended`
    // do vídeo ambos chamam onEnd — apenas o primeiro deve encerrar a animação.
    const hasEndedRef = useRef(false);

    // Mantém a referência sempre atualizada com a última função recebida por props
    useEffect(() => {
        onEndRef.current = onEnd;
    }, [onEnd]);

    // Efeito para preparar os assets em segundo plano (não bloqueia a animação)
    useEffect(() => {
        if (!payload || !payload.gift) {
            setResolvedAudio('');
            return;
        }

        const { gift } = payload;
        const assetConfig = LUXURY_ASSETS_MAP[gift.name] || getFallbackAsset(gift);
        // 🚫 VÍDEO DESATIVADO: o presente exibe apenas a animação em tela.
        // O mp4 do presente não é mais baixado/renderizado (economia de banda).
        const audioUrl = gift.audioUrl || assetConfig.audioSrc || getSoundUrl(gift.name);

        let active = true;
        const t0 = performance.now();

        async function prepareAssets() {
            try {
                // Somente áudio é resolvido (som de espetáculo); vídeo fica vazio.
                const cachedAudio = await giftCacheService.getCachedOrFetch(audioUrl);

                if (active) {
                    const elapsed = performance.now() - t0;
                    console.log(`[GiftPlayerPool] Prepared assets in ${elapsed.toFixed(1)}ms. Hit play!`);
                    setResolvedAudio(cachedAudio);
                }
            } catch (err) {
                console.error("[GiftPlayerPool] Preparação de áudio falhou:", err);
                if (active) {
                    setResolvedAudio(audioUrl);
                }
            }
        }

        prepareAssets();

        return () => {
            active = false;
        };
    }, [payload]);

    // ⏱️ Timer de encerramento (BACKUP): inicia IMEDIATAMENTE (sem esperar
    // assets). O encerramento EXATO acontece pelo evento `ended` do vídeo
    // (onVideoEnd → onEnd), que dispara no fim REAL da animação (Rosa 5.000s |
    // Champanhe 4.033s | Anel 4.367s — medidos com ffprobe). Este timer roda
    // APENAS uma vez por presente (NÃO reinicia quando o metadata chega, para
    // não somar o atraso do carregamento) e usa a duração real + pequena
    // margem, garantindo que a animação nunca fique presa na tela.
    useEffect(() => {
        const cleanup = () => {
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
                animationTimeoutRef.current = null;
            }
        };
        cleanup();
        hasEndedRef.current = false;

        if (!payload || !payload.gift) {
            return;
        }

        const { gift } = payload;
        const assetConfig = LUXURY_ASSETS_MAP[gift.name] || getFallbackAsset(gift);
        const hasRealAnimation = hasRealAnimationFile(gift);
        const baseDuration = hasRealAnimation
            ? (GIFT_ANIMATION_DURATIONS_MS[gift.name] ?? 5000)
            : Number(gift.duration || assetConfig.duration || 5000);

        animationTimeoutRef.current = window.setTimeout(() => {
            onEndRef.current();
        }, baseDuration + 250);

        return cleanup;
    }, [payload]);

    // 🔊 Som: toca quando o áudio fica pronto (não bloqueia a animação)
    useEffect(() => {
        const cleanupAudio = () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
        cleanupAudio();

        if (!payload || !payload.gift || !resolvedAudio) {
            return;
        }

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

        return cleanupAudio;
    }, [payload, resolvedAudio]);

    if (!payload || !payload.gift) return null;
    
    const { gift, fromUser, quantity } = payload;
    const assetConfig = LUXURY_ASSETS_MAP[gift.name] || getFallbackAsset(gift);
    const uniqueKey = payload.id ? `gift-fs-${payload.id}` : `gift-fs-${Date.now()}`;
    // 🎞️ Gifts com ANIMAÇÃO real (Rosa, Champanhe, Anel): o mp4 é desenhado
    // frame a frame num <canvas> WebGL com alpha mask (RGB + Alpha embutidos
    // no mesmo vídeo) — o elemento <video> fica OCULTO no DOM, então NENHUM
    // player/moldura de vídeo aparece na tela, só a animação em si, com a
    // duração EXATA do arquivo (Rosa 5s | Champanhe 4.03s | Anel 4.37s).
    // A transparência é REAL: o fundo preto não é exibido (GiftAlphaVideoPlayer).
    const realAnimationUrl = hasRealAnimationFile(gift) ? getAnimationUrl(gift) : undefined;
    // ⏱ Duração de exibição: o tempo REAL do arquivo (metadata → realAnimDurationMs)
    // ou o fallback medido (GIFT_ANIMATION_DURATIONS_MS) enquanto o metadata carrega.
    const displayDurationMs = realAnimationUrl
        ? (realAnimDurationMs ?? GIFT_ANIMATION_DURATIONS_MS[gift.name] ?? 5000)
        : null;

    return (
        <div 
            key={uniqueKey} 
            className="fixed inset-0 z-[9990] flex flex-col items-center justify-center pointer-events-none animate-gift-screen-container"
            style={{ animationDuration: displayDurationMs ? `${displayDurationMs}ms` : '5.5s' }}
        >
            {/* 1. ANIMAÇÃO REAL (mp4 → canvas WebGL com alpha mask transparente) */}
            {realAnimationUrl ? (
                <GiftAlphaVideoPlayer
                    key={`anim-${uniqueKey}`}
                    url={realAnimationUrl}
                    onDuration={setRealAnimDurationMs}
                    onVideoEnd={() => {
                        if (hasEndedRef.current) return;
                        hasEndedRef.current = true;
                        if (animationTimeoutRef.current) {
                            clearTimeout(animationTimeoutRef.current);
                            animationTimeoutRef.current = null;
                        }
                        onEndRef.current();
                    }}
                />
            ) : (
                <GiftEffectCanvas key={`canvas-${uniqueKey}`} gift={gift} />
            )}

            {/* 2. Animação central (partículas + ícone + banner) — para gifts sem mp4 */}
            <div className="flex flex-col items-center justify-center relative z-10 w-full h-full max-w-4xl px-4 select-none">
                
                {/* Efeito Glow Neon no fundo da visualização */}
                <div 
                    className="absolute w-72 h-72 rounded-full blur-[80px] opacity-40 animate-pulse scale-125"
                    style={{ backgroundColor: assetConfig.glowColor }}
                />

                {/* 🎭 ANIMAÇÃO do presente (ícone/componente SVG gigante + brilho).
                    Para gifts COM animação (mp4), o ícone NÃO é renderizado:
                    a animação em canvas cobre a tela inteira. Para os demais,
                    é o elemento central. (Nunca usar opacity-0 aqui: a animação
                    CSS gift-pop-impact anima a própria opacity até 1 e
                    sobrescreve a classe, deixando o ícone visível sobre o
                    vídeo — duplicando o presente na tela.) */}
                {!realAnimationUrl && (
                    <div className="relative flex items-center justify-center transform animate-gift-pop-impact w-[450px] h-[450px]">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none transform animate-gift-bounce-subtle">
                            {gift.component ? (
                                React.cloneElement(gift.component as React.ReactElement<any>, {
                                    className: "w-28 h-28 filter drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]"
                                })
                            ) : (
                                <span className="text-[8rem] leading-none filter drop-shadow-[0_0_25px_rgba(255,215,0,0.85)] select-none">
                                    {gift.icon}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Banners de Texto Enormes e Brilhantes com efeito carrossel e carinho */}
                <div className="mt-4 text-center z-20 flex flex-col items-center space-y-1 transform animate-gift-text-bounce">
                    <div className="flex items-center space-x-2 bg-black/60 px-5 py-2.5 rounded-full border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-md">
                        <img 
                            src={fromUser.avatarUrl || '/placeholders/avatar-placeholder.svg'} 
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

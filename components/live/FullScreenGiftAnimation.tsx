
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { GiftPayload } from './GiftAnimationOverlay';
import { Gift } from '../../types';
import GiftVapPlayer from './GiftVapPlayer';
import GiftLottiePlayer from './GiftLottiePlayer';
import { preloadLottieJson } from '../../services/LottiePreloader';
import { giftCacheService } from '../../services/GiftCacheService';
import { getAnimationUrl } from '../../services/GiftAnimationUrls';

// ⏱ Duração REAL de cada arquivo de animação (medida com ffprobe):
//   Rosa de Cristal   (rosa_cristal.mp4)   = 5.000s
//   Champanhe Dourada (champanhe_dourado.mp4) = 4.033s
//   Anel de Ouro      (anel_de_ouro.mp4)   = 4.367s
// Usado como fallback quando a duração real ainda não foi carregada pelo
// metadata do vídeo (o tempo exato sempre vem do arquivo em execução).
const GIFT_ANIMATION_DURATIONS_MS: Record<string, number> = {
    'Coração': 4033,
    'Rosa': 5000,
    'Pirulito': 4967,
    'Planta': 6033,
    'Sorvete': 10042,
    'Anel': 4367,
    'Champanhe': 4033,
    'Caixa de Presente Rosa': 5042,
    'Meu coração palpita por você': 7208,
    'Caixa de Música': 7067,
    'Foguete': 4000,
};

// 🎞️ APENAS estes presentes têm animação mp4 real (arquivos na pasta
// public/animations). NÃO usar getAnimationUrl genérico: ele também cobre
// outros gifts (.webm de /uploads/animations) que NÃO devem ir para o
// caminho de canvas — eles mantêm o efeito de partículas/ícone atual.
const GIFT_ANIMATION_NAMES = new Set(['Coração', 'Rosa', 'Pirulito', 'Planta', 'Sorvete', 'Anel', 'Champanhe', 'Caixa de Presente Rosa', 'Meu coração palpita por você', 'Caixa de Música', 'Foguete']);

// 🎞️ Presentes renderizados via LOTTIE (JSON direto no navegador — sem mp4):
// o foguete.json (pacote ZEGO 火箭, 750×1624, 25fps, 100 frames = 4000ms) é
// carregado pelo lottie-web em SVG; imagens (img_*.png) e som (aud_0.mp3) são
// arquivos externos no MESMO diretório do .json. A Caixa de Música usa o
// musicbox.json do pacote ZEGO (1500×1334, 30fps, 212 imagens webp) — SEM
// camada de áudio no JSON, então a melodia (gift-musicbox.mp3) toca em separado.
const GIFT_LOTTIE_URLS: Record<string, string> = {
    'Foguete': '/animations/foguete.json',
    'Caixa de Música': '/animations/musicbox.json',
};

// 🚀 Pré-carrega o JSON do Foguete assim que este módulo é importado (quando a
// sala de live/PK abre) — com os dados em memória, a animação aparece no
// instante em que o presente chega, sem atraso de download/parse.
Object.values(GIFT_LOTTIE_URLS).forEach(preloadLottieJson);

const isLottieGift = (gift: Gift): boolean => Boolean(GIFT_LOTTIE_URLS[gift.name]);

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
//   - /sounds/gift-musicbox.mp3 → MELODIA ORIGINAL da Caixa de Música
//     (extraída com ffmpeg do próprio musicbox.mp4 — mesmo som da animação).
// Os mp4 de animação NÃO têm trilha de áudio, então o efeito sonoro é tocado
// em separado (FullScreenGiftAnimation → efeito de áudio), como TikTok Live.
// Gifts com som PRÓPRIO (o som do arquivo de animação, não um chime genérico).
// Obs.: o Foguete NÃO está aqui — o som dele fica EMBUTIDO no próprio JSON
// Lottie (camada ty:6) e toca em sincronia via audioFactory do lottie-web.
const GIFT_SPECIAL_SOUNDS: Record<string, string> = {
    'Caixa de Música': '/sounds/gift-musicbox.mp3',
};

const getSoundUrl = (giftName: string): string => {
    if (GIFT_SPECIAL_SOUNDS[giftName]) return GIFT_SPECIAL_SOUNDS[giftName];
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

// 🎵 Notas musicais que sobem da caixinha durante a animação da Caixa de
// Música. O mp4 não embute notas — este overlay adiciona o efeito musical
// flutuante (aumento de escala + subida + balanço lateral + fade).
const MUSIC_NOTE_CHARS = ['♪', '♫', '♩', '♬', '♫', '♪'];
const MusicNotesOverlay: React.FC = () => {
    const notes = useMemo(() =>
        MUSIC_NOTE_CHARS.map((ch, i) => ({
            id: i,
            ch,
            left: 12 + ((i * 17) % 76),          // posição horizontal variada
            delay: i * 0.35,                     // saem em sequência
            dur: 4 + (i % 3) * 0.7,              // durações diferentes
            size: 28 + ((i * 13) % 34),          // tamanhos variados
            sway: ((i % 5) - 2) * 30,            // balanço lateral
            color: i % 2 === 0 ? '#FFD700' : '#ffffff',
        })), []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
            {notes.map(n => (
                <span
                    key={n.id}
                    className="absolute bottom-[38vh]"
                    style={{
                        left: `${n.left}%`,
                        color: n.color,
                        fontSize: `${n.size}px`,
                        opacity: 0,
                        textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                        animation: `gift-music-note-rise ${n.dur}s ease-in-out ${n.delay}s infinite`,
                        '--sway': `${n.sway}px`,
                    } as React.CSSProperties}
                >
                    {n.ch}
                </span>
            ))}
            <style>{`
                @keyframes gift-music-note-rise {
                    0%   { transform: translate(0, 40px) scale(0.4) rotate(-8deg); opacity: 0; }
                    12%  { opacity: 1; }
                    40%  { transform: translate(var(--sway), -20px) scale(1) rotate(6deg); opacity: 1; }
                    100% { transform: translate(calc(var(--sway) * 1.6), -48vh) scale(1.15) rotate(-10deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

/**
 * 🎞️ Player de animação de presente com TRANSPARÊNCIA REAL (VAP da Tencent).
 *
 * Os mp4 de presentes embutem o canal ALPHA no próprio frame: conteúdo RGB na
 * metade superior e a máscara (escala de cinza) na metade inferior. O HTML5
 * player não reconstrói essa transparência — por isso o GiftVapPlayer desenha a
 * animação num <canvas> WebGL com o shader do VAP (amostra rgbFrame + aFrame e
 * emite vec4(rgb, alpha)), deixando o fundo preto invisível sobre a transmissão
 * (mesmo efeito de TikTok Live / Bigo Live). O <video> fica OCULTO no DOM —
 * nenhum player aparece na tela.
 *
 * Reporta a duração REAL do arquivo via onDuration (loadedmetadata) para que o
 * timer de encerramento seja exatamente o tempo do vídeo.
 */
const FullScreenGiftAnimation: React.FC<{ payload: GiftPayload | null; onEnd: () => void; }> = ({ payload, onEnd }) => {
    const animationTimeoutRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [resolvedAudio, setResolvedAudio] = useState<string>('');
    // ⏱ Duração real do arquivo de animação (reportada pelo metadata do vídeo).
    const [realAnimDurationMs, setRealAnimDurationMs] = useState<number | null>(null);
    // 🛑 Fallback: se o mp4 falhar ao carregar/reproduzir, exibe o efeito de
    // partículas/ícone (GiftEffectCanvas) em vez de um espaço vazio.
    const [videoFailed, setVideoFailed] = useState(false);
    // 🛑 Fallback do LOTTIE: se o JSON/imagens falharem, tenta o vídeo VAP
    // (mp4/webm) antes de cair no efeito de partículas/ícone.
    const [lottieFailed, setLottieFailed] = useState(false);
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
        // 🎵 Som PRÓPRIO do gift (ex.: melodia da Caixa de Música) tem
        // prioridade; senão, usa o campo do gift → o asset → o chime padrão.
        // 🚀 Gifts LOTTIE com SOM na camada de áudio do JSON (Foguete) NÃO
        // usam áudio em separado (toca em sincronia via audioFactory — aud_0.mp3
        // externo ou data URI embutido).
        // A Caixa de Música é lottie SEM camada de áudio no JSON → a melodia
        // própria (gift-musicbox.mp3) toca em separado, como os gifts mp4.
        const audioUrl = (isLottieGift(gift) && gift.name === 'Foguete')
            ? ''
            : (GIFT_SPECIAL_SOUNDS[gift.name] || gift.audioUrl || assetConfig.audioSrc || getSoundUrl(gift.name));

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
        setVideoFailed(false);
        setLottieFailed(false);
        setRealAnimDurationMs(null);

        if (!payload || !payload.gift) {
            return;
        }

        const { gift } = payload;
        const assetConfig = LUXURY_ASSETS_MAP[gift.name] || getFallbackAsset(gift);
        const hasRealAnimation = hasRealAnimationFile(gift);
        const baseDuration = hasRealAnimation
            ? (GIFT_ANIMATION_DURATIONS_MS[gift.name] ?? 5000)
            : Number(gift.duration || assetConfig.duration || 5000);

        // ⏰ Timer BACKUP: começa na montagem para nunca travar a tela, mas
        // REINICIA quando o vídeo realmente começa a tocar (onPlaying) com a
        // duração real — assim o atraso de carregamento nunca corta a animação
        // no meio ("sai antes de mostrar a animação toda").
        const startTimer = () => {
            cleanup();
            animationTimeoutRef.current = window.setTimeout(() => {
                onEndRef.current();
            }, baseDuration + 250);
        };
        startTimer();

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
    // 🎞️ Gifts com ANIMAÇÃO real (Rosa, Champanhe, Anel, ...): o mp4 é desenhado
    // frame a frame num <canvas> WebGL com o shader do VAP (RGB + Alpha embutidos
    // no mesmo vídeo) — o elemento <video> fica OCULTO no DOM, então NENHUM
    // player/moldura de vídeo aparece na tela, só a animação em si, com a
    // duração EXATA do arquivo (Rosa 5s | Champanhe 4.03s | Anel 4.37s).
    // A transparência é REAL: o fundo preto não é exibido (GiftVapPlayer).
    // Foguete e Caixa de Música usam LOTTIE (JSON direto no navegador); se o
    // JSON falhar, caem no vídeo VAP (mp4/webm) como fallback antes do efeito
    // de partículas/ícone.
    const lottieUrl = isLottieGift(gift) ? GIFT_LOTTIE_URLS[gift.name] : undefined;
    const realAnimationUrl = hasRealAnimationFile(gift) ? getAnimationUrl(gift) : undefined;
    // ▶️ Mostra o LOTTIE quando o JSON está ok; o VAP quando não há lottie ou
    // o lottie falhou; partículas/ícone apenas se nenhum dos dois rodar.
    const showLottie = Boolean(lottieUrl) && !lottieFailed;
    const showVap = Boolean(realAnimationUrl) && !videoFailed && (!lottieUrl || lottieFailed);
    const showFallback = !showLottie && !showVap;
    // ⏱ Duração de exibição: o tempo REAL do arquivo (metadata → realAnimDurationMs)
    // ou o fallback medido (GIFT_ANIMATION_DURATIONS_MS) enquanto o metadata carrega.
    const displayDurationMs = (lottieUrl || realAnimationUrl)
        ? (realAnimDurationMs ?? GIFT_ANIMATION_DURATIONS_MS[gift.name] ?? 5000)
        : null;

    return (
        <div 
            key={uniqueKey} 
            className="fixed inset-0 z-[9990] flex flex-col items-center justify-center pointer-events-none animate-gift-screen-container"
            style={{ animationDuration: displayDurationMs ? `${displayDurationMs}ms` : '5.5s' }}
        >
            {/* 1. ANIMAÇÃO REAL: LOTTIE (JSON → SVG, sem mp4) ou VAP (mp4/webm → canvas) */}
            {showLottie ? (
                <GiftLottiePlayer
                    key={`anim-${uniqueKey}`}
                    url={lottieUrl}
                    giftName={gift.name}
                    onDuration={setRealAnimDurationMs}
                    onPlaying={() => {
                        // Reinicia o timer a partir do momento em que a animação
                        // de fato começou (a duração já veio do JSON/duracao real).
                        const durMs = realAnimDurationMs ?? GIFT_ANIMATION_DURATIONS_MS[gift.name] ?? 5000;
                        if (animationTimeoutRef.current) {
                            clearTimeout(animationTimeoutRef.current);
                            animationTimeoutRef.current = null;
                        }
                        animationTimeoutRef.current = window.setTimeout(() => {
                            onEndRef.current();
                        }, durMs + 250);
                    }}
                    onLoadError={() => setLottieFailed(true)}
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
            ) : showVap ? (
                <GiftVapPlayer
                    key={`anim-${uniqueKey}`}
                    url={realAnimationUrl}
                    giftName={gift.name}
                    onDuration={setRealAnimDurationMs}
                    onPlaying={() => {
                        // Reinicia o timer a partir do momento em que o vídeo
                        // de fato começou (a duração já veio do metadata).
                        const durMs = realAnimDurationMs ?? GIFT_ANIMATION_DURATIONS_MS[gift.name] ?? 5000;
                        if (animationTimeoutRef.current) {
                            clearTimeout(animationTimeoutRef.current);
                            animationTimeoutRef.current = null;
                        }
                        animationTimeoutRef.current = window.setTimeout(() => {
                            onEndRef.current();
                        }, durMs + 250);
                    }}
                    onLoadError={() => setVideoFailed(true)}
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
            ) : null}

            {/* 1b. 🎵 NOTAS MUSICAIS FLUTUANTES — exclusivo da Caixa de Música.
            O lottie/webm da caixinha NÃO embute notas (só a caixa + janela de
            foto); estas notas sobem da caixa como overlay, dando o efeito
            musical. */}
        {gift.name === 'Caixa de Música' && (showLottie || showVap) && (
            <MusicNotesOverlay />
        )}

        {/* 2. Apresentação LIMPA para presentes SEM vídeo mp4 (ou se o vídeo
                falhou): apenas o ícone do presente + quem enviou. SEM explosão
                de partículas, SEM glow de fundo. Os vídeos mp4 já trazem os
                próprios efeitos e são exibidos sozinhos acima. */}
            {showFallback && (
            <div className="flex flex-col items-center justify-center relative z-10 w-full h-full max-w-4xl px-4 select-none">
                <div className="relative flex items-center justify-center transform animate-gift-pop-impact w-[300px] h-[300px]">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none transform animate-gift-bounce-subtle">
                        {gift.component ? (
                            React.cloneElement(gift.component as React.ReactElement<any>, {
                                className: "w-28 h-28 filter drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]"
                            })
                        ) : typeof gift.icon === 'string' && (gift.icon.startsWith('http') || gift.icon.startsWith('/')) ? (
                            <img
                                src={gift.icon}
                                alt={gift.name}
                                className="w-28 h-28 object-contain filter drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]"
                            />
                        ) : (
                            <span className="text-[8rem] leading-none filter drop-shadow-[0_0_25px_rgba(255,215,0,0.85)] select-none">
                                {gift.icon}
                            </span>
                        )}
                    </div>
                </div>

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
            
            )}

            {/* CSS Global Embebido para Transições Fluídas e Pulsos Tridimensionais */}
            <style>{`
                @keyframes gift-screen-container-fade {
                    0% { opacity: 0; }
                    10% { opacity: 1; }
                    96% { opacity: 1; filter: blur(0); }
                    100% { opacity: 0; }
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

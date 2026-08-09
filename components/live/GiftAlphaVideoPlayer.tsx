
import React, { useRef, useEffect } from 'react';

// 🎞️ Player de animação de presente com TRANSPARÊNCIA REAL (alpha mask).
//
// Os arquivos .mp4 de presentes (rosa_cristal.mp4, champanhe_dourado.mp4,
// anel_de_ouro.mp4) NÃO possuem canal alpha nativo (h264/yuv420p). O canal de
// transparência é embutido NO MESMO frame, dividido em duas faixas verticais:
//
//   ┌─────────────┬───────────────┐
//   │  x [0,700)  │  x [750,1450) │
//   │  ALPHA      │  RGB          │
//   │  (grayscale)│  (conteúdo)   │
//   └─────────────┴───────────────┘
//   frame 1500 × 1624 (h264 yuv420p)
//
//   - Faixa esquerda [0,700): canal ALPHA em escala de cinza (branco = opaco).
//   - Faixa direita [750,1450): cores RGB do presente, JÁ PREMULTIPLICADAS
//     pelo alpha (verificado empiricamente: conteúdo ≤ alpha nos pixels
//     semi-transparentes — anel 0%, champanhe 0.4% de exceções).
//   - Correspondência 1:1: alpha(x,y) máscara o pixel de conteúdo (x+750, y)
//     (correlação 0.96 com os 3 arquivos — mesmo padrão usado por TikTok Live,
//     Bigo, ZEGO e Bytedance AlphaPlayer).
//
// O navegador não exibe nada deste processamento via <video> normal (o HTML5
// player não sabe reconstruir o alpha embutido). Por isso renderizamos com um
// <canvas> WebGL + shader personalizado: o shader amostra a cor na faixa RGB e
// a luminância na faixa alpha e emite `vec4(rgb, alpha)` (premultiplicado),
// produzindo um canvas TRANSPARENTE sobre a live — sem fundo preto.
//
// Padrão oficial documentado (stacked-alpha / side-by-side):
//   https://jakearchibald.com/2024/video-with-transparency/
//   https://github.com/jakearchibald/stacked-alpha-video
//   https://github.com/bytedance/AlphaPlayer (TikTok/Bytedance)

// 🎛️ Geometria dos arquivos de presente (medida com ffprobe/análise de pixels).
const FRAME_W = 1500;
const FRAME_H = 1624;
const ALPHA_X = 0;
const ALPHA_W = 700;
const CONTENT_X = 750;
const CONTENT_W = 700;

// ⚠️ O conteúdo do mp4 é PREMULTIPLICADO pelo alpha (edge escuro já embutido).
// Se os arquivos forem trocados por versões "straight" (sem premultiplicação),
// o resultado ficará com bordas claras — troque para `false` e multiplique
// rgb pelo alpha no shader.
const CONTENT_IS_PREMULTIPLIED = true;

interface GiftAlphaVideoPlayerProps {
    url: string;
    onDuration?: (ms: number) => void;
    /** Disparado quando o vídeo termina (fim REAL da animação). */
    onVideoEnd?: () => void;
    /** Disparado se o vídeo não puder ser carregado/reproduzido (fallback para partículas/ícone). */
    onLoadError?: () => void;
}

/**
 * Desenha a animação com transparência real via WebGL (shader personalizado),
 * com fallback para Canvas 2D quando WebGL não estiver disponível.
 *
 * O <video> existe APENAS como fonte de frames e fica OCULTO no DOM — nenhum
 * elemento de vídeo aparece na tela. O canvas transparente é a única coisa
 * visível, por cima da transmissão.
 *
 * Reporta a duração REAL do arquivo via onDuration (onLoadedMetadata) para que
 * o timer de encerramento seja exatamente o tempo do vídeo.
 */
const GiftAlphaVideoPlayer: React.FC<GiftAlphaVideoPlayerProps> = ({ url, onDuration, onVideoEnd, onLoadError }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const onDurationRef = useRef(onDuration);
    useEffect(() => { onDurationRef.current = onDuration; }, [onDuration]);
    const onVideoEndRef = useRef(onVideoEnd);
    useEffect(() => { onVideoEndRef.current = onVideoEnd; }, [onVideoEnd]);
    const onLoadErrorRef = useRef(onLoadError);
    useEffect(() => { onLoadErrorRef.current = onLoadError; }, [onLoadError]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // ⏱ Duração exata do arquivo (metadata) — o tempo de exibição é o
        // próprio tempo do vídeo, nunca um valor fixo.
        const reportDuration = (d: number) => {
            if (Number.isFinite(d) && d > 0) {
                onDurationRef.current?.(Math.round(d * 1000));
            }
        };

        // 🎞️ <video> FONTE DE FRAMES APENAS — nunca visível na tela.
        //
        // IMPORTANTE (Safari iOS / WebViews Android): NÃO usar `hidden=true`
        // (display:none) nem opacity:0 — nesses navegadores o elemento não é
        // composto e `texImage2D(video)`/`drawImage(video)` devolvem frame
        // preto, fazendo a animação sumir (presente "só com a animação").
        // O vídeo fica RENDERIZADO porém FORA DA VIEWPORT (offscreen), com
        // tamanho real — assim o frame é sempre extraível, sem nenhum
        // elemento de vídeo aparecer na tela.
        const video = document.createElement('video');
        video.muted = true; // ✅ mudo (sem autoplay-block, sem som na live)
        video.loop = false; // 🔚 Sem loop: o fim do vídeo é o fim real da animação.
        video.playsInline = true;
        video.autoplay = true;
        video.preload = 'auto';
        video.src = url;
        video.style.position = 'fixed';
        video.style.left = '-2000px';
        video.style.top = '0';
        video.style.width = `${FRAME_W}px`;
        video.style.height = `${FRAME_H}px`;
        video.style.opacity = '1';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-1';
        video.setAttribute('aria-hidden', 'true');
        video.setAttribute('tabindex', '-1');
        document.body.appendChild(video);

        // 🔄 Garante o play: alguns navegadores precisam de play() após o
        // carregamento dos dados (autoplay muted é sempre permitido).
        let playAttempt = 0;
        const ensurePlay = () => {
            const p = video.play();
            if (p && typeof p.then === 'function') {
                p.catch(() => {
                    playAttempt += 1;
                    if (playAttempt < 3) {
                        setTimeout(ensurePlay, 250);
                    } else if (onLoadErrorRef.current) {
                        onLoadErrorRef.current();
                    }
                });
            }
        };

        // 🛑 Fallback: se o arquivo não existir ou falhar ao carregar, avisa o
        // FullScreenGiftAnimation para exibir o efeito de partículas/ícone.
        let reportedError = false;
        const onVideoError = () => {
            if (!reportedError) {
                reportedError = true;
                onLoadErrorRef.current?.();
            }
        };

        const onMeta = () => reportDuration(video.duration);
        const onProgress = () => reportDuration(video.duration);
        const onLoadedData = () => { reportDuration(video.duration); ensurePlay(); };
        const onCanPlay = () => ensurePlay();
        const onPlaying = () => { ensurePlay(); };
        const onEnded = () => onVideoEndRef.current?.();
        video.addEventListener('loadedmetadata', onMeta);
        video.addEventListener('durationchange', onProgress);
        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('ended', onEnded);
        video.addEventListener('error', onVideoError);

        // ⏰ Se em 2.5s nada carregou (rede/recurso) → fallback para animação.
        const loadTimeout = window.setTimeout(() => {
            if (video.readyState === 0 || !video.videoWidth) {
                onVideoError();
            }
        }, 2500);

        let raf = 0;
        let stop = false;
        let usingFallback = false;

        const resizeCanvas = () => {
            // 📏 O backing store segue o TAMANHO DE LAYOUT da caixa
            // (clientWidth/clientHeight), que NÃO é afetado por transform de
            // escala. Durante o pop-in (scale 0.35→1) o canvas mantém a
            // resolução final de layout — sem ficar borrado enquanto cresce.
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const w = Math.max(1, Math.round((canvas.clientWidth || rect.width) * dpr));
            const h = Math.max(1, Math.round((canvas.clientHeight || rect.height) * dpr));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // ─────────────────────────── CAMINHO WEBGL ───────────────────────────
        const glAttrs: WebGLContextAttributes = {
            alpha: true,
            premultipliedAlpha: true,
            antialias: false,
            depth: false,
            stencil: false,
        };
        // WebGL2 aceita shaders GLSL ES 1.00/API WebGL1 — o cast cobre o
        // retorno union do getContext e mantém o código compatível com ambos.
        const gl =
            (canvas.getContext('webgl2', glAttrs) as WebGLRenderingContext | null) ||
            (canvas.getContext('webgl', glAttrs) as WebGLRenderingContext | null) ||
            (canvas.getContext('experimental-webgl', glAttrs) as WebGLRenderingContext | null);

        if (!gl) {
            // WebGL indisponível → fallback Canvas 2D abaixo.
            usingFallback = true;
        } else {
            const VERT_SRC = `
                attribute vec2 a_position;
                attribute vec2 a_texCoord;
                uniform vec4 u_rect;
                varying vec2 v_texCoord;
                void main() {
                    gl_Position = vec4(u_rect.xy + a_position * u_rect.zw, 0.0, 1.0);
                    v_texCoord = a_texCoord;
                }
            `;
            const FRAG_SRC = CONTENT_IS_PREMULTIPLIED
                ? `
                    precision mediump float;
                    varying vec2 v_texCoord;
                    uniform sampler2D u_frame;
                    void main() {
                        vec2 colorUV = vec2(${(CONTENT_X / FRAME_W).toFixed(6)} + v_texCoord.x * ${(CONTENT_W / FRAME_W).toFixed(6)}, v_texCoord.y);
                        vec2 alphaUV = vec2(${(ALPHA_X / FRAME_W).toFixed(6)} + v_texCoord.x * ${(ALPHA_W / FRAME_W).toFixed(6)}, v_texCoord.y);
                        vec3 rgb = texture2D(u_frame, colorUV).rgb;
                        float alpha = texture2D(u_frame, alphaUV).r;
                        // Conteúdo já vem PREMULTIPLICADO pelo alpha — emitir direto.
                        gl_FragColor = vec4(rgb, alpha);
                    }
                `
                : `
                    precision mediump float;
                    varying vec2 v_texCoord;
                    uniform sampler2D u_frame;
                    void main() {
                        vec2 colorUV = vec2(${(CONTENT_X / FRAME_W).toFixed(6)} + v_texCoord.x * ${(CONTENT_W / FRAME_W).toFixed(6)}, v_texCoord.y);
                        vec2 alphaUV = vec2(${(ALPHA_X / FRAME_W).toFixed(6)} + v_texCoord.x * ${(ALPHA_W / FRAME_W).toFixed(6)}, v_texCoord.y);
                        vec3 rgb = texture2D(u_frame, colorUV).rgb;
                        float alpha = texture2D(u_frame, alphaUV).r;
                        gl_FragColor = vec4(rgb * alpha, alpha);
                    }
                `;

            const compile = (type: number, src: string) => {
                const sh = gl.createShader(type);
                if (!sh) return null;
                gl.shaderSource(sh, src);
                gl.compileShader(sh);
                return sh;
            };

            const program = gl.createProgram();
            const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
            const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
            if (program && vs && fs) {
                gl.attachShader(program, vs);
                gl.attachShader(program, fs);
                gl.linkProgram(program);
            }

            let posBuffer: WebGLBuffer | null = null;
            let texBuffer: WebGLBuffer | null = null;
            let posLoc = -1;
            let texLoc = -1;
            let rectLoc: WebGLUniformLocation | null = null;
            let texLocUniform: WebGLUniformLocation | null = null;
            let texture: WebGLTexture | null = null;

            const setupGL = () => {
                if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
                gl.useProgram(program);

                const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
                const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]);

                posBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
                posLoc = gl.getAttribLocation(program, 'a_position');
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

                texBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
                texLoc = gl.getAttribLocation(program, 'a_texCoord');
                gl.enableVertexAttribArray(texLoc);
                gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

                rectLoc = gl.getUniformLocation(program, 'u_rect');
                texLocUniform = gl.getUniformLocation(program, 'u_frame');

                texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                // Textura sempre começará preta até o primeiro frame chegar.
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

                gl.uniform1i(texLocUniform, 0);
                return true;
            };

            if (!setupGL()) {
                usingFallback = true;
            } else {
                // Canvas transparente + conteúdo premultiplicado: escrevemos
                // (rgb, alpha) direto no buffer premultiplicado. Blending
                // DESLIGADO para não remultiplicar o rgb.
                gl.disable(gl.BLEND);
                gl.clearColor(0, 0, 0, 0);

                let lastUploadTime = -1;

                const drawGL = () => {
                    if (stop) return;
                    if (usingFallback) return;

                    // Letterbox "contain" — mantém a proporção do conteúdo
                    // (700×1624) sem esticar, centrado na tela.
                    const contentAspect = CONTENT_W / FRAME_H;
                    const cw = canvas.width;
                    const ch = canvas.height;
                    let dw = cw;
                    let dh = cw / contentAspect;
                    if (dh > ch) {
                        dh = ch;
                        dw = ch * contentAspect;
                    }
                    const dx = (cw - dw) / 2;
                    const dy = (ch - dh) / 2;

                    // Retângulo em clip space [-1,1].
                    const wc = (dw * 2) / cw;
                    const hc = (dh * 2) / ch;
                    const cx = ((dx + dw / 2) * 2) / cw - 1;
                    const cy = 1 - ((dy + dh / 2) * 2) / ch;

                    gl.viewport(0, 0, cw, ch);
                    gl.clear(gl.COLOR_BUFFER_BIT);

                    if (video.readyState >= 2 && video.videoWidth > 0) {
                        // Sobe o frame atual do <video> como textura.
                        gl.bindTexture(gl.TEXTURE_2D, texture);
                        if (video.currentTime !== lastUploadTime) {
                            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
                            lastUploadTime = video.currentTime;
                        }
                        gl.uniform4f(rectLoc, cx - wc / 2, cy - hc / 2, wc, hc);
                        gl.drawArrays(gl.TRIANGLES, 0, 6);
                    }

                    raf = requestAnimationFrame(drawGL);
                };

                const onContextLost = (e: Event) => {
                    e.preventDefault();
                    stop = true;
                    cancelAnimationFrame(raf);
                };
                const onContextRestored = () => {
                    if (setupGL()) {
                        stop = false;
                        gl.disable(gl.BLEND);
                        gl.clearColor(0, 0, 0, 0);
                        lastUploadTime = -1;
                        drawGL();
                    }
                };

                canvas.addEventListener('webglcontextlost', onContextLost);
                canvas.addEventListener('webglcontextrestored', onContextRestored);

                drawGL();
            }
        }

        // ─────────────────────── FALLBACK CANVAS 2D ────────────────────────
        if (usingFallback) {
            const ctx = canvas.getContext('2d');
            const maskCanvas = document.createElement('canvas');
            const maskCtx = maskCanvas.getContext('2d');
            // Máscara em meia-resolução (o upscale na composição é suave).
            const MASK_W = CONTENT_W / 2;
            const MASK_H = FRAME_H / 2;
            maskCanvas.width = MASK_W;
            maskCanvas.height = MASK_H;
            const maskBuf = ctx && maskCtx ? maskCtx.createImageData(MASK_W, MASK_H) : null;

            const draw2D = () => {
                if (stop) return;
                if (ctx && video.readyState >= 2 && video.videoWidth > 0) {
                    const cw = canvas.width;
                    const ch = canvas.height;
                    const contentAspect = CONTENT_W / FRAME_H;
                    let dw = cw;
                    let dh = cw / contentAspect;
                    if (dh > ch) {
                        dh = ch;
                        dw = ch * contentAspect;
                    }
                    const dx = (cw - dw) / 2;
                    const dy = (ch - dh) / 2;

                    ctx.clearRect(0, 0, cw, ch);

                    // Constrói a máscara: luminância da faixa alpha → canal alfa.
                    if (maskCtx && maskBuf) {
                        maskCtx.clearRect(0, 0, MASK_W, MASK_H);
                        maskCtx.drawImage(video, ALPHA_X, 0, ALPHA_W, FRAME_H, 0, 0, MASK_W, MASK_H);
                        const img = maskCtx.getImageData(0, 0, MASK_W, MASK_H);
                        for (let i = 0; i < img.data.length; i += 4) {
                            img.data[i + 3] = img.data[i];
                        }
                        maskBuf.data.set(img.data);
                        maskCtx.putImageData(maskBuf, 0, 0);

                        // Desenha o conteúdo RGB e aplica a máscara de alpha.
                        ctx.drawImage(video, CONTENT_X, 0, CONTENT_W, FRAME_H, dx, dy, dw, dh);
                        ctx.globalCompositeOperation = 'destination-in';
                        ctx.drawImage(maskCanvas, dx, dy, dw, dh);
                        ctx.globalCompositeOperation = 'source-over';
                    }
                }
                raf = requestAnimationFrame(draw2D);
            };
            draw2D();
        }

        ensurePlay();

        return () => {
            stop = true;
            cancelAnimationFrame(raf);
            window.clearTimeout(loadTimeout);
            window.removeEventListener('resize', resizeCanvas);
            video.removeEventListener('loadedmetadata', onMeta);
            video.removeEventListener('durationchange', onProgress);
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('error', onVideoError);
            try { video.pause(); } catch { /* ignore */ }
            try { video.src = ''; video.load(); } catch { /* ignore */ }
            try { video.remove(); } catch { /* ignore */ }
        };
    }, [url]);

    return (
        <div className="fixed inset-0 pointer-events-none select-none flex items-center justify-center" style={{ zIndex: 1 }}>
            <div
                className="relative"
                style={{
                    // 📏 ANIMAÇÃO GRANDE centralizada: mantém a proporção do
                    // conteúdo (700×1624 ≈ 0.431), limitada a ~72% da altura e
                    // 90% da largura — NUNCA corta, sempre inteira no meio da
                    // tela da transmissão.
                    //
                    // 🎬 O wrapper é centralizado por flex (o pai é fixed
                    // inset-0 + flex), então os keyframes NÃO precisam de
                    // translate — só escala/rotação em torno do próprio centro.
                    width: 'min(90vw, calc(72vh * 0.431034))',
                    maxWidth: '90vw',
                    maxHeight: '72vh',
                    aspectRatio: '700 / 1624',
                    animation: 'gift-video-pop-impact 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    willChange: 'transform, opacity',
                }}
            >
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                    style={{ zIndex: 1 }}
                />
                <style>{`
                    @keyframes gift-video-pop-impact {
                        0% { transform: scale(0.35) rotate(-15deg); opacity: 0; }
                        15% { transform: scale(1.15) rotate(5deg); opacity: 1; }
                        22% { transform: scale(0.95) rotate(-2deg); }
                        30% { transform: scale(1) rotate(0deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default GiftAlphaVideoPlayer;

// Auto-beleza — filtro padrão "mais jovem/natural" aplicado automaticamente
// quando a câmera liga para transmitir (GoLiveScreen) E dentro da sala de
// transmissão quando a mídia fica pronta sem filtro (ex.: F5 na live,
// reconexão, publicação direta). Fonte única da verdade para GoLive e StreamRoom.
//
// Regras:
// - SEMPRE liga ao abrir câmera/sala: limpa manchas, suaviza pele, clareia —
//   automático, sem depender de configuração prévia. Valores salvos por slider
//   VENCEM o padrão, MAS com PISO MÍNIMO nos efeitos de limpeza de pele
//   (manchas/rugas/olheiras/chiado): a live SEMPRE sai com a pele limpa.
// - O usuário ainda pode ajustar/zerar ao vivo pelo painel de beleza; o
//   watchdog da sala respeita se TODOS os efeitos estiverem zerados de propósito.

import { api } from './api';
import { DEFAULT_BEAUTY_SETTINGS } from './VideoProcessor';
import { videoProcessor } from './VideoProcessor';
import { streamPublishService } from './streamPublishService';
import { getVideoConstraints } from './cameraService';
import { beautyState } from './BeautyEngine';

const DEF = DEFAULT_BEAUTY_SETTINGS;

// Vídeo offscreen reutilizável (sala sem preview montado — caso F5).
let roomTempVideo: HTMLVideoElement | null = null;

/** Zera todos os efeitos 2D/malha — câmera crua (uso manual/painel). */
export function applyRawCameraSettings(): void {
    beautyState.update({
        whitening: 0,
        smoothing: 0,
        saturation: 0,
        contrast: 0,
        whiteBalance: 0,
        babyFace: 0,
        teethWhitening: 0,
        wrinkleSmoothing: 0,
        darkCircle: 0,
        acneRemoval: 0,
        shineReduction: 0,
        sharpness: 0,
        faceVolume3D: 0,
        noiseReduction: 0
    });
}

/**
 * Carrega preferências salvas do banco e aplica no beautyState.
 * Chamar DEPOIS de initialize() para sobrescrever defaults sem bloquear.
 */
export async function fetchAndApplyAutoBeauty(userId?: string | null): Promise<void> {
    if (!userId) return;
    try {
        const saved = await api.getBeautySettings(userId);
        const merged = buildMergedSettings(saved || {});
        beautyState.update(merged);
    } catch {
        // Mantém settings atuais se rede falhar
    }
}

/**
 * Carrega preferências salvas e mescla com os padrões. Aplica piso mínimo
 * nos efeitos de limpeza de pele (manchas/rugas/olheiras/chiado).
 */
export function buildMergedSettings(saved: Record<string, any>) {
    const s = saved || {};
    const num = (v: any, fallback: number) => (typeof v === 'number' ? v : fallback);

    return {
        ...DEF,
        whitening: num(s['Branquear'], DEF.whitening),
        smoothing: num(s['Alisar a pele'], DEF.smoothing),
        saturation: num(s['Ruborizar'], DEF.saturation),
        contrast: num(s['Contraste'], DEF.contrast),
        whiteBalance: num(s['Balanço de Branco'], DEF.whiteBalance),
        // Pisos mínimos de limpeza de pele
        acneRemoval: Math.max(num(s['Remover manchas'], DEF.acneRemoval), 55),
        wrinkleSmoothing: Math.max(num(s['Suavizar rugas'], DEF.wrinkleSmoothing), 32),
        darkCircle: Math.max(num(s['Clarear olheiras'], DEF.darkCircle), 22),
        nasolabialFolds: Math.max(num(s['Suavizar sorriso'], DEF.nasolabialFolds), 20),
        shineReduction: num(s['Reduzir brilho'], DEF.shineReduction),
        babyFace: num(s['Rosto Bebê'], DEF.babyFace),
        teethWhitening: num(s['Clarear dentes'], DEF.teethWhitening),
        sharpness: num(s['Nitidez'], DEF.sharpness),
        faceVolume3D: num(s['Efeito 3D'], DEF.faceVolume3D),
        // Novos parâmetros (Tencent doc 54291)
        cheekbone: num(s['Maçãs do rosto'], DEF.cheekbone),
        head: num(s['Formato cabeça'], DEF.head),
        eyeBrightness: num(s['Brilho olhos'], DEF.eyeBrightness),
        forehead: num(s['Testa'], DEF.forehead),
        // Piso mínimo 60: live sempre sai com limpeza de ruído digital forte
        noiseReduction: Math.max(num(s['Limpar Chiado'], DEF.noiseReduction), 60)
    };
}

/**
 * GARANTIA de filtro DENTRO da sala de transmissão — ORDEM CORRETA:
 * 1. Carrega configurações salvas (sync)
 * 2. Captura câmera
 * 3. Aplica settings mesclados (DEFAULT + salvos)
 * 4. Inicializa pipeline WebGL
 * 5. Espera frames fluindo
 * 6. SÓ DEPOIS liga preview + publish
 *
 * Cobre: F5 dentro da live, reconexão, entrada direta na sala (GoLive não rodou).
 *
 * Retorna o stream PROCESSADO pronto para publicar (ou null se falhar —
 * aí o chamador publica a câmera crua para nunca bloquear a live).
 */
export async function ensureLiveBeautyInRoom(userId?: string | null): Promise<MediaStream | null> {
    try {
        // ✅ Filtro já ativo e fluindo → só garante track publicada.
        //    NÃO chama applyBeautyToPreview() — canvas.captureStream() congela
        //    o <video> em dispositivos móveis.
        const existing = streamPublishService.getBeautyProcessedStream();
        if (existing && existing.getVideoTracks().some(t => t.readyState === 'live') && videoProcessor.isFramesFlowing()) {
            if (streamPublishService.isPublishing()) await streamPublishService.updateBeautyTrack();
            return existing;
        }

        // 🔐 0) CARREGAR CONFIGURAÇÕES SALVAS ANTES de tudo — sem flash de defaults.
        let mergedSettings = { ...DEFAULT_BEAUTY_SETTINGS };
        if (userId) {
            try {
                const saved = await api.getBeautySettings(userId);
                mergedSettings = buildMergedSettings(saved || {});
                // Auto-save: garante que TODOS os campos novos existem no banco.
                // O backend salva JSON flat — campos novos só aparecem depois de um POST.
                const allKeys: Record<string, number | string> = {
                    'Suavização do rosto': 35,
                    'Branquear': mergedSettings.whitening,
                    'Alisar a pele': mergedSettings.smoothing,
                    'Ruborizar': mergedSettings.saturation,
                    'Contraste': mergedSettings.contrast,
                    'Balanço de Branco': mergedSettings.whiteBalance,
                    'Rosto Bebê': mergedSettings.babyFace,
                    'Clarear dentes': mergedSettings.teethWhitening,
                    'Suavizar rugas': mergedSettings.wrinkleSmoothing,
                    'Clarear olheiras': mergedSettings.darkCircle,
                    'Remover manchas': mergedSettings.acneRemoval,
                    'Reduzir brilho': mergedSettings.shineReduction,
                    'Nitidez': mergedSettings.sharpness,
                    'Efeito 3D': mergedSettings.faceVolume3D,
                    'Limpar Chiado': mergedSettings.noiseReduction,
                    'Suavizar sorriso': mergedSettings.nasolabialFolds,
                    'Maçãs do rosto': mergedSettings.cheekbone,
                    'Formato cabeça': mergedSettings.head,
                    'Brilho olhos': mergedSettings.eyeBrightness,
                    'Testa': mergedSettings.forehead,
                };
                const missing = Object.keys(allKeys).filter(k => !(k in (saved || {})));
                if (missing.length > 0) {
                    api.updateBeautySettings(userId, { ...saved, ...allKeys })
                        .catch(() => { /* silencioso */ });
                    // Também salvar na beauty-store API dedicada
                    api.updateBeautyStoreAll(userId, { ...saved, ...allKeys } as Record<string, number>).catch(() => {});
                }
            } catch {
                // Mantém DEFAULT se rede falhar
            }
        }

        // 🎥 1) Câmera crua: reutiliza a atual ou captura AGORA (caso F5/sala direta).
        let raw = streamPublishService.getCurrentStream();
        if (!raw || !raw.getVideoTracks().some(t => t.readyState === 'live')) {
            const constraints = getVideoConstraints(streamPublishService.getFacingMode());
            raw = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: true });
            streamPublishService.setCurrentStream(raw);
        }

        // 🖼️ 2) Elemento de amostra: preview do host (registrado pelo LivePlayer)
        // ou um vídeo offscreen dedicado (sala sem preview montado ainda).
        let vEl = streamPublishService.getCurrentVideoElement();
        if (!vEl) {
            if (!roomTempVideo) {
                const tv = document.createElement('video');
                tv.muted = true;
                tv.setAttribute('playsinline', '');
                tv.style.position = 'fixed';
                tv.style.left = '-2000px';
                tv.style.top = '0';
                tv.style.width = '2px';
                tv.style.height = '2px';
                tv.style.opacity = '0';
                document.body.appendChild(tv);
                roomTempVideo = tv;
            }
            vEl = roomTempVideo;
        }
        // Amostrar SEMPRE a câmera crua (nunca o canvas processado — feedback loop).
        if (vEl.srcObject !== raw) {
            vEl.srcObject = raw;
            try { await vEl.play(); } catch { /* autoplay pode falhar silenciosamente */ }
        }

        // 🎨 3) FILTRO ANTES DE TRANSMITIR: settings mesclados (DEFAULT + salvos)
        // com pisos mínimos — beautyState é a single source of truth.
        beautyState.update(mergedSettings);
        const ok = await videoProcessor.initialize(vEl);
        if (!ok) return null;
        const processed = videoProcessor.startProcessing();
        if (!processed) return null;

        // ⏳ 4) Espera o filtro estar PRODUZINDO frames de verdade (máx ~4s) —
        // publicar antes disso enviaria câmera crua pros espectadores.
        const deadline = Date.now() + 4000;
        while (!videoProcessor.isFramesFlowing() && Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 120));
        }

        // 🔌 5) Guarda stream processado para publish — NÃO substitui o
        //    preview (canvas.captureStream() causa FREEZE no <video> em
        //    dispositivos móveis). O preview mostra câmera crua; o stream
        //    processado é usado APENAS no publish (RTMP/SRS via replaceTrack).
        streamPublishService.setBeautyProcessedStream(processed);

        console.log('✅ [AUTO_BEAUTY] Filtro pronto para publicar (preview mantido em câmera crua)');
        return processed;
    } catch (e) {
        console.warn('⚠️ [AUTO_BEAUTY] Falha ao garantir filtro na sala:', e);
        return null;
    }
}

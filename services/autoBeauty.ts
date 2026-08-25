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
import { videoProcessor, DEFAULT_BEAUTY_SETTINGS, BeautyEffectSettings } from './VideoProcessor';
import { streamPublishService } from './streamPublishService';
import { getVideoConstraints } from './cameraService';

const DEF = DEFAULT_BEAUTY_SETTINGS;

// Vídeo offscreen reutilizável (sala sem preview montado — caso F5).
let roomTempVideo: HTMLVideoElement | null = null;

/** Zera todos os efeitos 2D/malha — câmera crua (uso manual/painel). */
export function applyRawCameraSettings(): void {
    videoProcessor.updateBeautySettings({
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
    } as BeautyEffectSettings);
}

/**
 * Busca as preferências salvas do usuário e sobrescreve o padrão automático.
 * Chama DEPOIS de updateBeautySettings(DEFAULT_BEAUTY_SETTINGS) + initialize().
 * Nunca lança — falha de rede mantém o filtro padrão.
 */
export async function fetchAndApplyAutoBeauty(userId?: string | null): Promise<void> {
    if (!userId) return;
    try {
        const saved = await api.getBeautySettings(userId);
        const s = saved || {};
        const num = (v: any, fallback: number) => (typeof v === 'number' ? v : fallback);

        // 🎨 AUTO-BELEZA SEMPRE LIGA ao abrir a câmera/sala (regra do produto:
        // "abriu sala → rosto limpo/jovem automaticamente"). Bloqueios salvos
        // antigos (ex.: 'Suavização do rosto': 0 de testes passados) NÃO mais
        // desligam o automático — o usuário ainda pode ajustar/tudo zerar ao
        // vivo pelo painel, e o watchdog da sala respeita imagem crua pedida.
        const master = s['Suavização do rosto'];

        videoProcessor.updateBeautySettings({
            ...DEF,
            whitening: num(s['Branquear'], DEF.whitening),
            smoothing: num(s['Alisar a pele'], DEF.smoothing),
            saturation: num(s['Ruborizar'], DEF.saturation),
            contrast: num(s['Contraste'], DEF.contrast),
            whiteBalance: num(s['Balanço de Branco'], DEF.whiteBalance),
            // 🧼 PISOS MÍNIMOS de limpeza de pele — manchas/rugas/olheiras nunca
            // voltam por causa de valor antigo salvo no banco.
            acneRemoval: Math.max(num(s['Remover manchas'], DEF.acneRemoval), 55),
            wrinkleSmoothing: Math.max(num(s['Suavizar rugas'], DEF.wrinkleSmoothing), 32),
            darkCircle: Math.max(num(s['Clarear olheiras'], DEF.darkCircle), 22),
            shineReduction: num(s['Reduzir brilho'], DEF.shineReduction),
            babyFace: num(s['Rosto Bebê'], DEF.babyFace),
            teethWhitening: num(s['Clarear dentes'], DEF.teethWhitening),
            sharpness: num(s['Nitidez'], DEF.sharpness),
            faceVolume3D: num(s['Efeito 3D'], DEF.faceVolume3D),
            // Piso mínimo 60: live sempre sai com limpeza de ruído digital forte.
            noiseReduction: Math.max(num(s['Limpar Chiado'], DEF.noiseReduction), 60)
        });

        if (typeof master !== 'number') {
            // 💾 Primeira vez ao vivo: grava o automático LIGADO (35).
            api.updateBeautySettings(userId, { ...s, 'Suavização do rosto': 35 })
                .catch(() => { /* silencioso — nunca bloqueia a live */ });
        }
    } catch {
        // Mantém o filtro padrão se não conseguir carregar as salvas
    }
}

/**
 * GARANTIA de filtro DENTRO da sala de transmissão — ORDEM CORRETA:
 * captura câmera → liga o filtro → espera frames fluindo → SÓ DEPOIS publica.
 * Cobre: F5 dentro da live, reconexão, entrada direta na sala (GoLive não rodou).
 *
 * Retorna o stream PROCESSADO pronto para publicar (ou null se falhar —
 * aí o chamador publica a câmera crua para nunca bloquear a live).
 */
export async function ensureLiveBeautyInRoom(userId?: string | null): Promise<MediaStream | null> {
    try {
        // ✅ Filtro já ativo e fluindo → só garante preview + track publicada.
        const existing = streamPublishService.getBeautyProcessedStream();
        if (existing && existing.getVideoTracks().some(t => t.readyState === 'live') && videoProcessor.isFramesFlowing()) {
            streamPublishService.applyBeautyToPreview();
            if (streamPublishService.isPublishing()) await streamPublishService.updateBeautyTrack();
            return existing;
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

        // 🎨 3) FILTRO ANTES DE TRANSMITIR (ordem obrigatória): padrão jovem/natural
        // ligado já, pipeline WebGL inicializado com o frame cru.
        videoProcessor.updateBeautySettings({ ...DEFAULT_BEAUTY_SETTINGS });
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

        // 🔌 5) Liga o resultado ao preview do host e guarda para o publish.
        streamPublishService.setBeautyProcessedStream(processed);
        streamPublishService.applyBeautyToPreview();

        console.log('✅ [AUTO_BEAUTY] Filtro fluindo na sala — pronto para publicar');
        // Preferências salvas do usuário VENCEM o padrão depois (não bloqueia).
        void fetchAndApplyAutoBeauty(userId);
        return processed;
    } catch (e) {
        console.warn('⚠️ [AUTO_BEAUTY] Falha ao garantir filtro na sala:', e);
        return null;
    }
}
// Vídeo offscreen reutilizável (sala sem preview montado — caso F5).

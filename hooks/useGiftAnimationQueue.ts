import { useState, useEffect, useCallback, useRef } from 'react';
import { GiftPayload } from '../components/live/GiftAnimationOverlay';

/**
 * 🎁 Hook de fila de animação de presentes.
 * Encapsula a lógica de enfileiramento e exibição sequencial (1 por vez)
 * que antes ficava espalhada no StreamRoom.
 *
 * Arquitetura inspirada no GiftPlayView da Tencent:
 *   - painel independente gerencia sua própria fila
 *   - recebe eventos via push (enqueueGift)
 *   - exibe um presente de cada vez em overlay sobre o vídeo
 *   - ao terminar, desenfileira o próximo automaticamente
 */
export function useGiftAnimationQueue() {
    const [queue, setQueue] = useState<GiftPayload[]>([]);
    const [current, setCurrent] = useState<GiftPayload | null>(null);

    const enqueueGift = useCallback((payload: GiftPayload) => {
        if (!payload?.fromUser?.id || !payload?.gift?.name) return;
        setQueue(prev => [...prev, payload]);
    }, []);

    const onAnimationEnd = useCallback(() => {
        setCurrent(null);
    }, []);

    // Desenfileira quando o atual termina
    useEffect(() => {
        if (!current && queue.length > 0) {
            const next = queue[0];
            setCurrent(next);
            setQueue(prev => prev.slice(1));
        }
    }, [current, queue]);

    return {
        current,
        queue,
        enqueueGift,
        onAnimationEnd,
        /** Quantidade pendente (excluindo o que está na tela) */
        pendingCount: queue.length,
    };
}

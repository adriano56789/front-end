import React, { useImperativeHandle, forwardRef } from 'react';
import { GiftPayload } from './GiftAnimationOverlay';
import FullScreenGiftAnimation from './FullScreenGiftAnimation';
import { useGiftAnimationQueue } from '../../hooks/useGiftAnimationQueue';

/**
 * 🎁 GiftAnimationPanel — painel de reprodução de animações de presentes.
 *
 * Inspirado no GiftPlayView da Tencent (doc: product/1071/76700):
 *   - Componente transparente sobre a camada de vídeo, abaixo dos controles
 *   - Recebe eventos de presente e reproduz a animação correspondente
 *   - Camada independente do player de transmissão
 *   - Gerencia fila internamente (1 animação por vez, sequencial)
 *
 * Diferente da Tencent, NÃO se inscreve em eventos de sala automaticamente.
 * O componente pai (StreamRoom) alimenta via ref → pushGift(payload).
 *
 * Z-INDEX:
 *   - Vídeo: z-0
 *   - Este painel: z-[10] (acima do vídeo, abaixo do header z-20 e chat z-30)
 *   - O FullScreenGiftAnimation interno herda o z-index do painel (absolute inset-0)
 *
 * TRANSPARÊNCIA:
 *   - pointer-events-none: não bloqueia interação com vídeo/chat
 *   - fundo transparente: só mostra a animação do presente
 *   - Lottie JSON/SVG com alpha REAL (sem blend modes)
 *   - Suporte a MP4 dual-channel alpha (GiftAlphaVideoPlayer) quando necessário
 */
export interface GiftAnimationPanelHandle {
    pushGift: (payload: GiftPayload) => void;
}

interface GiftAnimationPanelProps {
    /** Callback quando um presente começa a ser exibido (opcional, para analytics/logging) */
    onGiftStarted?: (gift: GiftPayload) => void;
}

const GiftAnimationPanel = forwardRef<GiftAnimationPanelHandle, GiftAnimationPanelProps>(
    ({ onGiftStarted }, ref) => {
        const { current, enqueueGift, onAnimationEnd, pendingCount } = useGiftAnimationQueue();

        // Expõe pushGift para o componente pai via ref
        useImperativeHandle(ref, () => ({
            pushGift: (payload: GiftPayload) => {
                console.log('[GiftPanel] pushGift chamado:', payload?.gift?.name, 'de', payload?.fromUser?.name);
                enqueueGift(payload);
            },
        }), [enqueueGift]);

        // Notifica quando um presente começa a exibir
        const prevGiftIdRef = React.useRef<string | number | null>(null);
        React.useEffect(() => {
            if (current && current.id !== prevGiftIdRef.current) {
                prevGiftIdRef.current = current.id;
                onGiftStarted?.(current);
            }
            if (!current) {
                prevGiftIdRef.current = null;
            }
        }, [current, onGiftStarted]);

        return (
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 10, background: 'transparent' }}
                aria-label="Painel de animação de presentes"
            >
                <FullScreenGiftAnimation
                    payload={current}
                    onEnd={onAnimationEnd}
                />
            </div>
        );
    }
);

GiftAnimationPanel.displayName = 'GiftAnimationPanel';

export default GiftAnimationPanel;

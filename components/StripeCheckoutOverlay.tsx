import React, { useEffect, useRef } from 'react';
import { ToastType } from '../types';
import { api } from '../services/api';

// ═══ Stripe Embedded Checkout — abre a página REAL do Stripe DENTRO do app ═══
// Carrega o Stripe.js e monta o checkout embutido em uma tela full-screen.
// Quando o pagamento conclui, fica monitorando o status da compra e avisa.

interface StripeCheckoutOverlayProps {
    clientSecret: string;
    publishableKey: string;
    orderId: string;
    openUrl?: string;
    onPaid: () => void;
    onClose: () => void;
    addToast: (type: ToastType, message: string) => void;
}

let stripeJsPromise: Promise<any> | null = null;

function loadStripeJs(): Promise<any> {
    if ((window as any).Stripe) return Promise.resolve((window as any).Stripe);
    if (!stripeJsPromise) {
        stripeJsPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => resolve((window as any).Stripe);
            script.onerror = () => reject(new Error('Não foi possível carregar o Stripe.'));
            document.head.appendChild(script);
        });
    }
    return stripeJsPromise;
}

const StripeCheckoutOverlay: React.FC<StripeCheckoutOverlayProps> = ({ clientSecret, publishableKey, orderId, openUrl, onPaid, onClose, addToast }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const onPaidRef = useRef(onPaid);
    const orderIdRef = useRef(orderId);
    onPaidRef.current = onPaid;
    orderIdRef.current = orderId;

    useEffect(() => {
        let disposed = false;
        let checkoutInstance: any = null;
        let pollTimer: any = null;

        const startPolling = () => {
            if (pollTimer) return;
            pollTimer = setInterval(async () => {
                try {
                    const st = await api.getStripeCheckoutStatus(orderIdRef.current);
                    if (st && st.paid) {
                        clearInterval(pollTimer);
                        pollTimer = null;
                        if (!disposed) onPaidRef.current();
                    }
                } catch (err) {
                    // mantém monitorando; ignora erros temporários
                }
            }, 2500);
        };

        loadStripeJs()
            .then((Stripe: any) => {
                if (disposed) return null;
                const stripe = Stripe(publishableKey);
                return stripe.initEmbeddedCheckout({ clientSecret, onComplete: startPolling });
            })
            .then((co: any) => {
                if (disposed || !co || !mountRef.current) return;
                checkoutInstance = co;
                try {
                    co.mount(mountRef.current);
                } catch (err) {
                    if (!disposed) addToast(ToastType.Error, 'Erro ao abrir o pagamento dentro do app. Tente de novo.');
                }
            })
            .catch(() => {
                if (!disposed) addToast(ToastType.Error, 'Não foi possível abrir o pagamento no app. Use o link externo.');
            });

        return () => {
            disposed = true;
            clearInterval(pollTimer);
            try {
                if (checkoutInstance && typeof checkoutInstance.destroy === 'function') checkoutInstance.destroy();
            } catch (err) {
                // ignora
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientSecret]);

    return (
        <div className="fixed inset-0 z-[200] bg-[#0b0a0e] flex flex-col text-white font-sans">
            <header className="flex items-center justify-between px-4 py-3 bg-[#0b0a0e] border-b border-white/[0.04] flex-shrink-0">
                <button
                    onClick={onClose}
                    className="text-[12px] font-bold text-[#8a8894] hover:text-white transition-colors px-2 py-1.5 cursor-pointer"
                >
                    ✕ Fechar
                </button>
                <div className="text-[14px] font-extrabold tracking-tight">Pagamento Seguro · Stripe</div>
                <a
                    href={openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-bold text-[#8a3ffc] hover:text-[#a866ff] transition-colors px-2 py-1.5 cursor-pointer"
                >
                    Abrir em nova aba ↗
                </a>
            </header>

            <main className="flex-grow overflow-y-auto">
                <div ref={mountRef} className="w-full" />
            </main>

            <footer className="px-4 py-3 text-center text-[11px] text-[#5c5966] font-medium flex-shrink-0">
                🔒 Página oficial do Stripe carregada dentro do app. Seus dados de pagamento nunca passam pela LiveGo.
            </footer>
        </div>
    );
};

export default StripeCheckoutOverlay;
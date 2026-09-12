import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRightIcon } from './icons';
import { useTranslation } from '../i18n';
import { User, ToastType } from '../types';
import { api } from '../services/api';
import { LoadingSpinner } from './Loading';
import GanhosDisplay from './GanhosDisplay';
import { safeError } from '../utils/maskSensitiveData';

interface GanhosTabProps {
    onConfigure: () => void;
    onOpenConnect: () => void;
    currentUser: User;
    updateUser: (user: User) => void;
    addToast: (type: ToastType, message: string) => void;
}

interface EarningsInfo {
    available_diamonds: number;
    locked_diamonds?: number;
    debt?: number;
    brl_value: number;
    eur_value: number;
    usd_value: number;
    local_value: number;
    currency: string;
    currency_symbol: string;
    conversion_rate: string;
    rate_source: string;
    withdrawal_method?: any;
}

interface WithdrawalCalculation {
    diamonds: number;
    currency: string;
    currency_symbol: string;
    rate_source: string;
    gross_brl: number;
    platform_fee_brl: number;
    stripe_fee_brl: number;
    net_brl: number;
    local_gross: number;
    local_platform_fee: number;
    local_stripe_fee: number;
    local_net: number;
    pix_transfer_amount_brl: number;
    note?: string;
}

interface ConnectStatus {
    connected: boolean;
    provider?: string;
    accountId?: string;
    details_submitted?: boolean;
    payouts_enabled?: boolean;
    charges_enabled?: boolean;
    onboarded_at?: string;
    hasPixKey?: boolean;
    message?: string;
}

type CurrencyCode = 'BRL' | 'USD' | 'EUR';

const CURRENCIES: { code: CurrencyCode; label: string; short: string; symbol: string; payMethod: string }[] = [
    { code: 'BRL', label: 'Pix (BRL)', short: 'Pix', symbol: 'R$', payMethod: 'BRL' },
    { code: 'USD', label: 'Dólar (USD)', short: 'USD', symbol: 'US$', payMethod: 'Dólar' },
    { code: 'EUR', label: 'Euro (EUR)', short: 'EUR', symbol: '€', payMethod: 'Euro' },
];

// ═══ LIVE GO — Saques via Stripe: Pix (BRL) e conta conectada (USD/EUR) ═══
// Todo o dinheiro das compras cai centralizado na conta Stripe da plataforma.
// No saque, o Stripe paga automaticamente a hoste: Pix (BRL) pela chave cadastrada
// ou via conta Stripe conectada (KYC) em Dólar/Euro. Divisão: 80% hoste / 20% plataforma.

const GanhosTab: React.FC<GanhosTabProps> = ({ onConfigure, onOpenConnect, currentUser, updateUser, addToast }) => {
    const { t } = useTranslation();
    const [earningsInfo, setEarningsInfo] = useState<EarningsInfo | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [calculation, setCalculation] = useState<WithdrawalCalculation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('BRL');
    const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
    const [isLoadingConnect, setIsLoadingConnect] = useState(false);

    const activeCurrency = CURRENCIES.find((c) => c.code === selectedCurrency) || CURRENCIES[0];

    const fetchEarningsInfo = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getEarnings(currentUser.id);
            setEarningsInfo(data);

            // Se a API retornar withdrawal_method, atualizar o usuário
            if (data.withdrawal_method && !currentUser.withdrawal_method) {
                updateUser({ ...currentUser, withdrawal_method: data.withdrawal_method });
            }

            // Auto-calcular para o valor máximo disponível SEMPRE que carregar
            if (data.available_diamonds > 0) {
                const amount = data.available_diamonds.toString();
                setWithdrawAmount(amount);
            }
            // NÃO limpa withdrawAmount quando 0 — permite simulação manual
        } catch (err) {
            addToast(ToastType.Error, (err as Error).message || "Falha ao carregar informações de ganhos.");
        } finally {
            setIsLoading(false);
        }
    }, [currentUser.id, currentUser, updateUser, addToast]);

    // Fetch apenas no mount - atualizações via WebSocket
    useEffect(() => {
        fetchEarningsInfo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Consulta a situação da conta Stripe conectada da hoste (KYC/payouts)
    useEffect(() => {
        setIsLoadingConnect(true);
        api.stripeConnectStatus()
            .then((status) => setConnectStatus(status))
            .catch((err) => safeError('[GanhosTab] Falha ao consultar conta Stripe Connect:', err))
            .finally(() => setIsLoadingConnect(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Atualiza o status do Connect após o retorno do onboarding (wallet?connect=done)
    useEffect(() => {
        const onFocus = () => {
            if (connectStatus?.connected === false || !connectStatus) {
                api.stripeConnectStatus()
                    .then((status) => setConnectStatus(status))
                    .catch(() => {});
            }
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectStatus]);

    // Calculate withdrawal value in real-time as user types (com debounce) — via Stripe
    useEffect(() => {
        const amount = parseInt(withdrawAmount);

        // ⚠️ NÃO processa vazio ou inválido
        if (!withdrawAmount || isNaN(amount) || amount <= 0) {
            return;
        }

        // ⚠️ Verificar se currentUser.id está disponível
        if (!currentUser?.id) {
            console.warn('[GanhosTab] currentUser.id não disponível para cálculo');
            return;
        }

        // Debounce: esperar 500ms antes de calcular
        const timeoutId = setTimeout(() => {
            setIsCalculating(true);
            api.getStripeQuote(amount, selectedCurrency)
                .then((result) => {
                    setCalculation(result as any);
                })
                .catch((error) => {
                    // ⚠️ NÃO limpa estado em caso de erro
                    safeError('[GanhosTab] Erro ao calcular saque:', error);
                })
                .finally(() => setIsCalculating(false));
        }, 500);

        // Limpar timeout se o valor mudar novamente
        return () => clearTimeout(timeoutId);
    }, [withdrawAmount, currentUser?.id, selectedCurrency]);

    const handleCurrencyChange = (code: CurrencyCode) => {
        if (code === selectedCurrency) return;
        setSelectedCurrency(code);
        setCalculation(null);
    };

    const handleMaxClick = () => {
        if (earningsInfo) {
            setWithdrawAmount(earningsInfo.available_diamonds.toString());
        }
    };

    const handleConfirmWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0 || !earningsInfo || amount > earningsInfo.available_diamonds) {
            addToast(ToastType.Error, "Valor de saque inválido.");
            return;
        }

        const needsConnect = selectedCurrency !== 'BRL';
        const connectReady = !!connectStatus?.connected && !!connectStatus?.payouts_enabled;

        if (needsConnect && !connectReady) {
            addToast(ToastType.Error, `Conecte sua conta Stripe (KYC) para sacar em ${activeCurrency.short}.`);
            return;
        }

        if (!needsConnect && !connectReady && !(earningsInfo?.withdrawal_method || currentUser.withdrawal_method)) {
            addToast(ToastType.Error, "Cadastre sua conta de recebimento (Stripe) ou configure uma chave Pix primeiro.");
            onConfigure();
            return;
        }

        setIsWithdrawing(true);
        try {
            // Saque via Stripe: Pix (BRL) ou conta conectada (USD/EUR).
            // O backend sempre zera o saldo inteiro disponível — aqui enviamos o total.
            const totalAvailable = Math.floor(earningsInfo?.available_diamonds ?? 0);
            const response = await api.stripeWithdraw(currentUser.id, calculation?.diamonds || totalAvailable || Math.floor(amount), selectedCurrency);

            if (response.success) {
                const symbol = activeCurrency.symbol;
                addToast(ToastType.Success,
                    `Saque de ${symbol} ${(response.quote?.local_net ?? 0).toFixed(2).replace('.', ',')} confirmado! Saldo zerado. ` +
                    (response.statusNote ? response.statusNote : (needsConnect ? 'O Stripe pagará direto na sua conta de recebimento.' : 'O valor será pago direto na sua conta de recebimento.')) +
                    ` ID: ${response.withdrawalId}`
                );

                // Atualizar dados do usuário após saque
                const freshEarnings = await api.getEarnings(currentUser.id);

                if (freshEarnings) {
                    setEarningsInfo(freshEarnings);
                }

                setWithdrawAmount('');
                setCalculation(null);
            } else {
                throw new Error((response as any).error || "Falha na solicitação de saque.");
            }
        } catch (error: any) {
            const msg = (error as Error).message || "Falha na solicitação de saque.";
            if (/conecte sua conta stripi/i.test(msg)) {
                addToast(ToastType.Error, 'Conecte sua conta Stripe antes de sacar nesta moeda.');
            } else {
                addToast(ToastType.Error, msg);
            }
        } finally {
            setIsWithdrawing(false);
        }
    };

    const formatCurrency = (value: number | undefined, symbol?: string) => `${symbol || 'R$'} ${(value ?? 0).toFixed(2).replace('.', ',')}`;

    const formatCurrencyShort = (value: number | undefined, symbol: string) => `${symbol} ${(value ?? 0).toFixed(2).replace('.', ',')}`;

    // Mostrar cálculo sempre
    const shouldShowCalculation = true;

    const displayAmount = withdrawAmount === '' ? 0 : (parseInt(withdrawAmount) || 0);

    // Quote real do Stripe (backend, taxas do banco) — a fonte dos valores do saque.
    // Sem quote ainda, não exibe estimativa local (dados vêm do banco).
    const q = calculation as any;
    const hasQuote = !!q?.diamonds && q.diamonds === displayAmount && typeof q.local_net === 'number';
    const view = hasQuote ? {
        gross: q.local_gross ?? q.gross_brl,
        platformFee: q.local_platform_fee ?? q.platform_fee_brl,
        stripeFee: q.local_stripe_fee ?? q.stripe_fee_brl,
        net: q.local_net ?? q.net_brl,
        fxNote: q.note,
    } : null;

    const needsConnect = selectedCurrency !== 'BRL';
    const connectReady = !!connectStatus?.connected && !!connectStatus?.payouts_enabled;
    const isWithdrawButtonDisabled = isWithdrawing || displayAmount <= 0 || displayAmount > (earningsInfo?.available_diamonds || 0) || (needsConnect && !connectReady);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-10">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {(() => {
                const earningsValue = earningsInfo?.available_diamonds ?? 0;
                return <GanhosDisplay earnings={earningsValue} />;
            })()}

            {earningsInfo && (earningsInfo.available_diamonds > 0 || earningsInfo.brl_value > 0 || earningsInfo.usd_value > 0 || earningsInfo.eur_value > 0) && (
                <div className="bg-[#141316] rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#5c5966] mb-3 ml-1">VALOR EM CADA MOEDA</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[12px] font-bold text-[#8a8894]">🇧🇷 Real (BRL)</span>
                            <span className="text-[14px] font-black text-white">{formatCurrencyShort(earningsInfo.brl_value, 'R$')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[12px] font-bold text-[#8a8894]">🇺🇸 Dólar (USD)</span>
                            <span className="text-[14px] font-black text-white">{formatCurrencyShort(earningsInfo.usd_value, 'US$')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[12px] font-bold text-[#8a8894]">🇪🇺 Euro (EUR)</span>
                            <span className="text-[14px] font-black text-white">{formatCurrencyShort(earningsInfo.eur_value, '€')}</span>
                        </div>
                    </div>
                    {earningsInfo.conversion_rate && (
                        <p className="text-[10px] text-[#5c5966] font-medium mt-2.5 px-1">
                            Taxa: {earningsInfo.conversion_rate} · {earningsInfo.rate_source}
                        </p>
                    )}
                </div>
            )}

            {(earningsInfo?.locked_diamonds || 0) > 0 && (
                <div className="bg-[#241a38] border border-[#7a3be9]/30 rounded-[14px] p-3.5 px-4">
                    <div className="flex items-center space-x-2 mb-1">
                        <svg className="w-4 h-4 text-[#8a3ffc] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span className="text-[12px] font-black text-white tracking-wide">{(earningsInfo?.locked_diamonds || 0).toLocaleString('pt-BR')} diamantes sob análise</span>
                    </div>
                    <p className="text-[11px] text-[#a1a1aa] font-medium leading-snug">
                        Parte dos seus ganhos está retida preventivamente (estorno/anti-fraude) por até 7 dias.
                        Sem chargeback comprovado, o valor é liberado automaticamente.
                    </p>
                </div>
            )}

            {(earningsInfo?.debt || 0) > 0 && (
                <div className="bg-rose-950/30 border border-rose-500/25 rounded-[14px] p-3.5 px-4">
                    <div className="flex items-center space-x-2 mb-1">
                        <svg className="w-4 h-4 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 11h-1.5M17 15h-1.5M17 7h-1.5M20 4v16a0 0 0 1 0 0H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2" />
                            <path d="M3 19V5a1 1 0 0 1 1-1h16" transform="translate(0 0)" />
                            <path d="M17 11h0" transform="translate(0 0)"/>
                            <path d="M9 11h5v8H9z" opacity="0"/>
                        </svg>
                        <span className="text-[12px] font-black text-rose-300 tracking-wide">Débito de chargeback: {(earningsInfo?.debt || 0).toLocaleString('pt-BR')} diamantes</span>
                    </div>
                    <p className="text-[11px] text-[#a1a1aa] font-medium leading-snug">
                        Existe um estorno por fraude em aberto. O valor será descontado dos seus futuros ganhos até quitar.
                    </p>
                </div>
            )}

            <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#8a8894] block ml-1">
                    MOEDA DO SAQUE
                </span>
                <div className="grid grid-cols-3 gap-2">
                    {CURRENCIES.map((c) => {
                        const isActive = selectedCurrency === c.code;
                        return (
                            <button
                                key={c.code}
                                onClick={() => handleCurrencyChange(c.code)}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-[14px] transition-all cursor-pointer select-none active:scale-[0.98] border ${
                                    isActive
                                        ? 'bg-[#241a38] border-[#7a3be9]/50 text-[#8a3ffc]'
                                        : 'bg-[#131215] border-[#27262a] text-[#8a8894] hover:bg-[#1a191d]'
                                }`}
                                id={`btn-currency-${c.code}`}
                            >
                                <span className="text-[12px] font-black tracking-wide">{c.short}</span>
                                <span className="text-[10px] font-medium text-[#5c5966]">{c.payMethod}</span>
                            </button>
                        );
                    })}
                </div>
                <p className="text-[10px] text-[#5c5966] font-medium leading-snug px-1">
                    Escolha a moeda do saque. O valor será convertido automaticamente e pago na conta cadastrada no Stripe.
                </p>
            </div>

            <div className="space-y-3">
                <label id="withdraw-amount-label" htmlFor="withdraw-amount" className="text-[11px] font-black uppercase tracking-wider text-[#8a8894] block ml-1">
                    VALOR DO SAQUE
                </label>
                <div className="flex items-center space-x-3">
                    <input
                        id="withdraw-amount"
                        type="number"
                        placeholder="Digite a quantidade de diamantes"
                        value={withdrawAmount}
                        onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, '');
                            setWithdrawAmount(v);
                        }}
                        className="flex-grow bg-[#131215] text-white placeholder-gray-600 rounded-[14px] p-3 px-4 font-bold text-[16px] border border-[#27262a] focus:border-[#8a3ffc]/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all h-[52px]"
                    />
                    <button
                        onClick={handleMaxClick}
                        className="bg-[#241a38] hover:bg-[#2c2045] text-[#7a3be9] font-bold px-6 h-[52px] rounded-[14px] transition-all text-[13px] uppercase tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-[0.98]"
                        id="btn-max-withdrawal"
                    >
                        TOTAL
                    </button>
                </div>
                <p className="text-[10px] text-[#5c5966] font-medium leading-snug px-1">
                    💰 O saque limpa TODO o seu saldo de diamantes de uma vez — nada fica sobrando.
                </p>
            </div>

            {shouldShowCalculation && (
                <div className="bg-[#141316] rounded-2xl p-4 py-5 px-5 shadow-sm mt-5">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <span className="text-[12px] font-black uppercase tracking-wider text-[#8a3ffc]">{activeCurrency.label}</span>
                    </div>

                    {(() => {
                        if (!view) {
                            return (
                                <div className="flex flex-col items-center justify-center py-4 space-y-2">
                                    <LoadingSpinner />
                                    <span className="text-[11px] text-[#5c5966] font-medium">Calculando...</span>
                                </div>
                            );
                        }
                        const sym = activeCurrency.symbol;
                        return (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#8a8894] font-bold text-[13px]">Valor Bruto ({activeCurrency.short})</span>
                                    <span className="text-white font-black text-[14px]">
                                        {formatCurrency(view.gross, sym)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-[#8a8894] font-bold text-[13px]">Taxa da Plataforma (20%)</span>
                                    <span className="text-[#d97745] font-black text-[14px]">
                                        - {formatCurrency(view.platformFee, sym)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-[#8a8894] font-bold text-[13px]">
                                        Taxa do Stripe (paga por você)
                                    </span>
                                    <span className="text-[#d97745] font-black text-[14px]">
                                        - {formatCurrency(view.stripeFee, sym)}
                                    </span>
                                </div>
                                {view.fxNote && (
                                    <p className="text-[10px] text-[#5c5966] font-medium mt-3 leading-snug">{view.fxNote}</p>
                                )}
                                <div className="flex justify-between items-center pt-5 pb-1">
                                    <span className="text-white font-extrabold text-[15px]">Você Recebe ({activeCurrency.short})</span>
                                    <span className="text-[#10b981] font-black text-[20px] tracking-tight">
                                        {formatCurrency(view.net, sym)}
                                    </span>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            <div className="space-y-3 mt-6">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-[#8a8894] ml-1">MÉTODO DE SAQUE</h3>
                <button 
                    onClick={onConfigure} 
                    className="w-full flex justify-between items-center bg-[#141316] p-4.5 px-5 rounded-[14px] hover:bg-[#1a191d] transition-all cursor-pointer shadow-sm min-h-[56px]"
                    id="btn-configure-method"
                >
                    <span className="text-white font-bold text-[14px]">
                        {(earningsInfo?.withdrawal_method || currentUser.withdrawal_method) ? 
                            (() => {
                                const method = (earningsInfo?.withdrawal_method || currentUser.withdrawal_method);
                                const rawMethod = (method.method || '').toString();
                                let maskedDetails = '';

                                if (rawMethod === 'pix' && method.details?.pixKey) {
                                    const pixKey = method.details.pixKey;
                                    if (pixKey.includes('@')) {
                                        const emailMatch = pixKey.match(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)/);
                                        if (emailMatch) {
                                            const domain = emailMatch[2];
                                            maskedDetails = `*********@${domain}`;
                                        } else {
                                            maskedDetails = '***';
                                        }
                                    } else if (pixKey.length > 4) {
                                        maskedDetails = pixKey.substring(0, 2) + '*'.repeat(pixKey.length - 4) + pixKey.substring(pixKey.length - 2);
                                    } else {
                                        maskedDetails = '***';
                                    }
                                } else {
                                    maskedDetails = '***';
                                }

                                return `Pix: ${maskedDetails}`;
                            })()
                            : 'Configurar Método'
                        }
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-[#4b4a52]" />
                </button>
                <p className="text-[10px] text-[#5c5966] text-center font-medium mt-3 leading-none">
                    Recebimento cadastrado no formulário oficial do Stripe: Pix/banco em Real (Brasil), conta Dólar ACH (EUA) e IBAN Euro SEPA (Portugal).
                </p>
            </div>

            {(() => {
                const receiveInfo = selectedCurrency === 'BRL'
                    ? 'Pix ou conta bancária em Real (BRL)'
                    : selectedCurrency === 'USD'
                        ? 'conta bancária em Dólar (ACH)'
                        : 'conta com IBAN em Euro (SEPA)';

                const hasPixKey = !!connectStatus?.hasPixKey;

                if (!connectReady) {
                    return (
                        <div className="bg-[#241a38] border border-[#7a3be9]/40 rounded-[14px] p-4">
                            <p className="text-[12px] font-black text-white tracking-wide">
                                {hasPixKey
                                    ? 'Sua chave Pix está configurada'
                                    : 'Cadastre sua conta de recebimento'
                                }
                            </p>
                            <p className="text-[11px] text-[#a1a1aa] font-medium mt-1 leading-snug">
                                {hasPixKey ? (
                                    <>Chave Pix já salva. Para sacar em <strong>USD ou EUR</strong>, cadastre sua conta Stripe (KYC). Para sacar em <strong>BRL</strong>, a chave Pix já é suficiente.</>
                                ) : (
                                    <>O cadastro é feito no formulário oficial do Stripe (KYC, uma única vez). Depois disso, todo saque vai
                                    automático, direto para a sua conta: {receiveInfo}. Sem aprovação manual.</>
                                )}
                            </p>
                            <button
                                onClick={onOpenConnect}
                                disabled={isLoadingConnect}
                                className="w-full mt-3 bg-[#8a3ffc] hover:bg-[#7a3be9] text-white font-black py-3 rounded-[12px] transition-all cursor-pointer text-[13px] tracking-wide select-none active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                                id="btn-connect-stripe"
                            >
                                Cadastrar conta no Stripe
                            </button>
                            {connectStatus?.connected && !connectStatus?.payouts_enabled && (
                                <p className="text-[11px] text-[#d97745] font-medium mt-2 leading-snug">
                                    Sua conta já existe, mas o cadastro ainda não foi concluído. Termine pelo link acima para liberar os pagamentos.
                                </p>
                            )}
                        </div>
                    );
                }
                if (connectReady) {
                    return (
                        <div className="bg-emerald-950/25 border border-emerald-500/25 rounded-[14px] p-3.5 px-4">
                            <div className="flex items-center space-x-2 mb-1">
                                <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                                <span className="text-[12px] font-black text-emerald-300 tracking-wide">Conta de recebimento liberada — saques automáticos</span>
                            </div>
                            <p className="text-[11px] text-[#a1a1aa] font-medium leading-snug">
                                Quando você confirmar o saque, o valor é pago na hora, direto na sua conta cadastrada ({receiveInfo}).
                                A comissão da plataforma (20%) fica retida separadamente na conta do LiveGo.
                            </p>
                        </div>
                    );
                }
                if (isLoadingConnect) {
                    return (
                        <div className="bg-[#141316] rounded-[14px] p-4 flex items-center justify-center">
                            <LoadingSpinner />
                            <span className="ml-2 text-[11px] text-[#5c5966] font-medium">Consultando conta Stripe...</span>
                        </div>
                    );
                }
                return null;
            })()}

            <div className="pt-6">
                <button 
                    onClick={handleConfirmWithdraw}
                    disabled={isWithdrawButtonDisabled}
                    className="w-full bg-[#7a3be9] hover:bg-[#6b2ed3] text-white font-black py-[18px] rounded-[16px] transition-all cursor-pointer text-[16px] tracking-wide select-none active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                    id="btn-confirm-saque"
                >
                    {isWithdrawing ? "Processando..." : `Confirmar Saque (${activeCurrency.short})`}
                </button>
            </div>

        </div>
    );
};

export default GanhosTab;
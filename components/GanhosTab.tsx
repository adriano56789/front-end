import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRightIcon, BrazilFlagIcon, PortugalFlagIcon, USAFlagIcon } from './icons';
import { useTranslation } from '../i18n';
import { User, ToastType } from '../types';
import { api } from '../services/api';
import { LoadingSpinner } from './Loading';
import GanhosDisplay from './GanhosDisplay';
import { safeError } from '../utils/maskSensitiveData';

interface GanhosTabProps {
    onConfigure: () => void;
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
    net_brl: number;
    gross_eur: number;
    platform_fee_eur: number;
    net_eur: number;
    gross_usd: number;
    platform_fee_usd: number;
    net_usd: number;
    local_gross: number;
    local_fee: number;
    local_net: number;
    breakdown: { conversion: string; fee: string; final: string; };
}

type DisplayCurrency = 'BRL' | 'EUR' | 'USD';

const CURRENCY_OPTIONS: { code: DisplayCurrency; flag: React.ReactNode; label: string; symbol: string }[] = [
    { code: 'BRL', flag: <BrazilFlagIcon className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10" />, label: 'Real', symbol: 'R$' },
    { code: 'EUR', flag: <PortugalFlagIcon className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10" />, label: 'Euro', symbol: '€' },
    { code: 'USD', flag: <USAFlagIcon className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10" />, label: 'Dólar', symbol: 'US$' },
];

const GanhosTab: React.FC<GanhosTabProps> = ({ onConfigure, currentUser, updateUser, addToast }) => {
    const { t } = useTranslation();
    const [earningsInfo, setEarningsInfo] = useState<EarningsInfo | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [calculation, setCalculation] = useState<WithdrawalCalculation | null>(null);
    const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('BRL');
    const [isLoading, setIsLoading] = useState(true);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const fetchEarningsInfo = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getEarnings(currentUser.id);
            setEarningsInfo(data);
            
            // Moeda inicial segue a moeda do país do usuário
            if (data.currency === 'EUR' || data.currency === 'USD') {
                setDisplayCurrency(data.currency);
            } else {
                setDisplayCurrency('BRL');
            }
            
            // Se a API retornar withdrawal_method, atualizar o usuário
            if (data.withdrawal_method && !currentUser.withdrawal_method) {
                updateUser({ ...currentUser, withdrawal_method: data.withdrawal_method });
            }
            
            // Auto-calcular para o valor máximo disponível SEMPRE que carregar
            if (data.available_diamonds > 0) {
                const amount = data.available_diamonds.toString();
                setWithdrawAmount(amount);
            } else {
                // Se não tiver diamantes, limpar valores
                setWithdrawAmount('');
                setCalculation(null);
            }
        } catch (err) {
            addToast(ToastType.Error, (err as Error).message || "Falha ao carregar informações de ganhos.");
        } finally {
            setIsLoading(false);
        }
    }, [currentUser.id, currentUser, updateUser, addToast]);

    // Fetch apenas no mount - atualizações via WebSocket
    useEffect(() => {
        fetchEarningsInfo();
    }, []);

    // Calculate withdrawal value in real-time as user types (com debounce) — via Payoneer
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
            api.getPayoneerQuote(amount, displayCurrency)
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
    }, [withdrawAmount, displayCurrency, currentUser?.id]);

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

        if (!(earningsInfo?.withdrawal_method || currentUser.withdrawal_method)) {
            addToast(ToastType.Error, "Configure um método de saque primeiro.");
            onConfigure();
            return;
        }

        setIsWithdrawing(true);
        try {
            // Saque liquidado via Payoneer (Pix BRL / conta USD / conta EUR)
            const response = await api.payoneerWithdraw(currentUser.id, calculation?.diamonds || Math.floor(amount), displayCurrency);

            if (response.success) {
                const symbol = response.currency === 'EUR' ? '€' : response.currency === 'USD' ? 'US$' : 'R$';
                addToast(ToastType.Success,
                    `Saque de ${symbol} ${(response.quote?.local_net ?? 0).toFixed(2).replace('.', ',')} confirmado! ` +
                    (response.statusNote ? response.statusNote : 'O Payoneer processará a transferência para sua conta.') +
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
        } catch (error) {
            addToast(ToastType.Error, (error as Error).message || "Falha na solicitação de saque.");
        } finally {
            setIsWithdrawing(false);
        }
    };

    const formatCurrency = (value: number | undefined, symbol?: string) => `${symbol || 'R$'} ${(value ?? 0).toFixed(2).replace('.', ',')}`;

    // Mostrar cálculo sempre
    const shouldShowCalculation = true;

    const displayAmount = withdrawAmount === '' ? 0 : (parseInt(withdrawAmount) || 0);

    // Estimativa local (fallback enquanto o backend responde): diamante → BRL → taxas → Payoneer
    const gross_brl = displayAmount * 0.00875;
    const platform_fee_brl = gross_brl * 0.20;
    const after_platform_brl = gross_brl - platform_fee_brl;
    const payoneer_fee_brl_est = Math.min(after_platform_brl, after_platform_brl * 0.02 + 2);
    const net_final_brl_est = after_platform_brl - payoneer_fee_brl_est;

    const FX_EST: Record<string, number> = { BRL: 1, EUR: 0.1613, USD: 0.1786 };
    const SYMBOL_MAP: Record<string, string> = { BRL: 'R$', USD: 'US$', EUR: '€' };
    const sym = SYMBOL_MAP[displayCurrency] || 'R$';
    const fxEst = FX_EST[displayCurrency] || 1;

    // Quote real do Payoneer (backend) quando disponível para o valor digitado
    const q = calculation as any;
    const hasQuote = !!q?.diamonds && q.diamonds === displayAmount && typeof q.local_net === 'number';
    const view = hasQuote ? {
        gross: q.local_gross ?? q.gross_brl,
        platformFee: q.local_platform_fee ?? q.platform_fee_brl,
        payoneerFee: q.local_payoneer_fee ?? 0,
        net: q.local_net ?? q.net_brl,
        fxNote: q.note,
    } : {
        gross: gross_brl * fxEst,
        platformFee: platform_fee_brl * fxEst,
        payoneerFee: payoneer_fee_brl_est * fxEst,
        net: net_final_brl_est * fxEst,
        fxNote: undefined,
    };

    const isWithdrawButtonDisabled = isWithdrawing || displayAmount <= 0 || displayAmount > (earningsInfo?.available_diamonds || 0);

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
                            <path d="M17 11h-1.5M17 15h-1.5M17 7h-1.5M20 4v16a0 0 0 0 1 0 0H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2" />
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
                <label id="withdraw-amount-label" htmlFor="withdraw-amount" className="text-[11px] font-black uppercase tracking-wider text-[#8a8894] block ml-1">
                    VALOR DO SAQUE
                </label>
                <div className="flex items-center space-x-3">
                    <input
                        id="withdraw-amount"
                        type="number"
                        placeholder="0"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="flex-grow bg-[#131215] text-white placeholder-gray-600 rounded-[14px] p-3 px-4 font-bold text-[16px] border border-[#27262a] focus:border-[#8a3ffc]/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all h-[52px]"
                    />
                    <button 
                        onClick={handleMaxClick} 
                        className="bg-[#241a38] hover:bg-[#2c2045] text-[#7a3be9] font-bold px-6 h-[52px] rounded-[14px] transition-all text-[13px] uppercase tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-[0.98]"
                        id="btn-max-withdrawal"
                    >
                        MÁXIMO
                    </button>
                </div>
            </div>

            {shouldShowCalculation && (
                <div className="bg-[#141316] rounded-2xl p-4 py-5 px-5 shadow-sm mt-5">
                    <div className="flex justify-center gap-6 mb-6">
                        {CURRENCY_OPTIONS.map((opt) => (
                            <button
                                key={opt.code}
                                onClick={() => setDisplayCurrency(opt.code)}
                                className={`flex flex-col items-center space-y-1.5 cursor-pointer transition-all outline-none ${
                                    displayCurrency === opt.code
                                        ? 'opacity-100 scale-105'
                                        : 'opacity-40 hover:opacity-80'
                                }`}
                                id={`flag-${opt.code}`}
                            >
                                {opt.flag}
                                <span className={`text-[11px] font-black uppercase tracking-wider ${displayCurrency === opt.code ? 'text-white' : 'text-[#8a8894]'}`}>
                                    {opt.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {(() => {
                        return (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#8a8894] font-bold text-[13px]">Valor Bruto ({displayCurrency})</span>
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
                                        Taxa do Payoneer (paga por você)
                                        {displayCurrency !== 'BRL' && <span className="text-[10px] font-medium text-[#5c5966]"> · câmbio Payoneer</span>}
                                    </span>
                                    <span className="text-[#d97745] font-black text-[14px]">
                                        - {formatCurrency(view.payoneerFee, sym)}
                                    </span>
                                </div>
                                {view.fxNote && (
                                    <p className="text-[10px] text-[#5c5966] font-medium mt-3 leading-snug">{view.fxNote}</p>
                                )}
                                <div className="flex justify-between items-center pt-5 pb-1">
                                    <span className="text-white font-extrabold text-[15px]">Você Recebe</span>
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
                                const methodName = rawMethod.toUpperCase();
                                let maskedDetails = '';
                                let label = '';

                                if (rawMethod === 'payoneer_account' || rawMethod === 'mercado_pago') {
                                    label = 'Payoneer';
                                    const email = method.details.payoneerEmail || method.details.email || '';
                                    const emailMatch = email.match(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)/);
                                    maskedDetails = emailMatch ? `*********@${emailMatch[2]}` : '***';
                                } else if (rawMethod === 'pix' && method.details.pixKey) {
                                    label = 'Pix (Payoneer)';
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
                                } else if ((rawMethod === 'bank_eur' || rawMethod === 'bank_usd' || rawMethod === 'bank') && method.details.bankName !== undefined) {
                                    label = rawMethod === 'bank_usd' ? 'Conta USD' : rawMethod === 'bank_eur' ? 'Conta EUR' : 'Conta Bancária';
                                    maskedDetails = `•••• ${(method.details.accountHolder || '').toUpperCase() || '...'}`;
                                } else {
                                    label = methodName;
                                }
                                
                                return `${label}: ${maskedDetails}`;
                            })()
                            : 'Configurar Método'
                        }
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-[#4b4a52]" />
                </button>
                <p className="text-[10px] text-[#5c5966] text-center font-medium mt-3 leading-none">
                    {displayCurrency !== 'BRL'
                        ? `O valor será convertido pelo Payoneer e enviado para sua conta (${displayCurrency}).`
                        : 'Saques liquidados via Payoneer — Pix, dólar ou euro.'}
                </p>
            </div>

            <div className="pt-6">
                <button 
                    onClick={handleConfirmWithdraw}
                    disabled={isWithdrawButtonDisabled}
                    className="w-full bg-[#7a3be9] hover:bg-[#6b2ed3] text-white font-black py-[18px] rounded-[16px] transition-all cursor-pointer text-[16px] tracking-wide select-none active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                    id="btn-confirm-saque"
                >
                    {isWithdrawing ? "Processando..." : "Confirmar Saque"}
                </button>
            </div>

        </div>
    );
};

export default GanhosTab;
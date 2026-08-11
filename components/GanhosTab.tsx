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

    // Calculate withdrawal value in real-time as user types (com debounce)
    useEffect(() => {
        const amount = parseInt(withdrawAmount);
        
        // ⚠️ NÃO processa vazio ou inválido
        if (!withdrawAmount || isNaN(amount) || amount <= 0) {
            return;
        }

        // ⚠️ NÃO calcular se já tivermos calculation para o mesmo valor
        if (calculation && calculation.diamonds === amount) {
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
            api.calculateWithdrawal(amount, currentUser.id)
                .then((result) => {
                    setCalculation(result);
                })
                .catch((error) => {
                    // ⚠️ NÃO limpa estado em caso de erro
                    safeError('[GanhosTab] Erro ao calcular saque:', error);
                })
                .finally(() => setIsCalculating(false));
        }, 500);

        // Limpar timeout se o valor mudar novamente
        return () => clearTimeout(timeoutId);
    }, [withdrawAmount, calculation, currentUser?.id]);

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

        if (!calculation) {
            addToast(ToastType.Error, "Aguarde o cálculo dos valores.");
            return;
        }

        setIsWithdrawing(true);
        try {
            const withdrawalMethod = earningsInfo?.withdrawal_method || currentUser.withdrawal_method;
            const methodName = (withdrawalMethod.method || '').toString().toLowerCase();
            const currencySymbol = calculation.currency_symbol || 'R$';

            let response;
            if (methodName === 'pix') {
                // Extrair chave Pix e tipo do método configurado
                let pixKey = '';
                let pixKeyType = '';

                pixKey = withdrawalMethod.details.pixKey;
                // Determinar tipo da chave Pix baseado no formato
                if (pixKey.includes('@')) {
                    pixKeyType = 'email';
                } else if (/^\d{11}$/.test(pixKey)) {
                    pixKeyType = 'cpf';
                } else if (/^\d{14}$/.test(pixKey)) {
                    pixKeyType = 'cnpj';
                } else if (pixKey.startsWith('+')) {
                    pixKeyType = 'phone';
                } else {
                    pixKeyType = 'evp'; // Chave aleatória
                }

                // Iniciar saque via Pix
                response = await api.withdrawViaPix(currentUser.id, calculation.diamonds, pixKey, pixKeyType);
            } else if (methodName === 'bank') {
                // Saque bancário internacional exige endereço fiscal completo (Receita Federal/BC)
                const addr = withdrawalMethod.details?.address || {};
                if (!addr.street || !addr.city || !addr.country) {
                    addToast(ToastType.Error, "Saque internacional exige endereço fiscal completo. Atualize seu método de saque.");
                    onConfigure();
                    return;
                }
                // Iniciar saque bancário (EUR/USD)
                response = await api.withdrawViaBank(currentUser.id, calculation.diamonds);
            } else {
                addToast(ToastType.Error, "Método de saque não suportado.");
                return;
            }
            
            if (response.success) {
                addToast(ToastType.Success, 
                    `Saque de ${currencySymbol} ${calculation.local_net.toFixed(2)} iniciado! ` +
                    `O dinheiro será transferido em até ${methodName === 'bank' ? '3 dias úteis' : '1 dia útil'}. ` +
                    `ID da transferência: ${response.withdrawalId || response.transferId}`
                );
                
                // Atualizar dados do usuário após saque
                const freshEarnings = await api.getEarnings(currentUser.id);
                
                if (freshEarnings) {
                    setEarningsInfo(freshEarnings);
                }
                
                setWithdrawAmount('');
                setCalculation(null);
            } else {
                throw new Error(response.error || "Falha na solicitação de saque.");
            }
        } catch (error) {
            addToast(ToastType.Error, (error as Error).message || "Falha na solicitação de saque.");
        } finally {
            setIsWithdrawing(false);
        }
    };

    const formatCurrency = (value: number | undefined, symbol?: string) => `${symbol || 'R$'} ${(value ?? 0).toFixed(2).replace('.', ',')}`;

    // Mostrar cálculo sempre, como na imagem de referência
    const shouldShowCalculation = true;
    
    // Usar valores locais, mesma conversão da imagem (304 diamantes = 2.66 BRL -> 2.66 / 304 = 0.00875)
    // Se o input de saque estiver vazio, vamos assumir o valor de 0
    const displayAmount = withdrawAmount === '' ? 0 : (parseInt(withdrawAmount) || 0);
    
    const gross_brl = displayAmount * 0.00875;
    const platform_fee_brl = gross_brl * 0.20;
    const net_brl = gross_brl * 0.80;
    
    const displayData: WithdrawalCalculation = calculation || {
        diamonds: displayAmount,
        currency: earningsInfo?.currency || 'BRL',
        currency_symbol: earningsInfo?.currency_symbol || 'R$',
        rate_source: earningsInfo?.rate_source || 'fallback',
        gross_brl: gross_brl,
        platform_fee_brl: platform_fee_brl,
        net_brl: net_brl,
        gross_eur: gross_brl * 0.1613,
        platform_fee_eur: platform_fee_brl * 0.1613,
        net_eur: net_brl * 0.1613,
        gross_usd: gross_brl * 0.1786,
        platform_fee_usd: platform_fee_brl * 0.1786,
        net_usd: net_brl * 0.1786,
        local_gross: gross_brl,
        local_fee: platform_fee_brl,
        local_net: net_brl,
        breakdown: {
            conversion: `${displayAmount} diamantes = R$ ${gross_brl.toFixed(2).replace('.', ',')}`,
            fee: `Taxa da plataforma (20%): R$ ${platform_fee_brl.toFixed(2).replace('.', ',')}`,
            final: `Valor a receber: R$ ${net_brl.toFixed(2).replace('.', ',')}`,
        }
    };
    
    // Se temos calculation do backend, usar os valores reais da API se combinarem com o amount atual
    if (calculation && calculation.diamonds === displayAmount) {
        displayData.gross_brl = calculation.gross_brl;
        displayData.platform_fee_brl = calculation.platform_fee_brl;
        displayData.net_brl = calculation.net_brl;
        displayData.gross_eur = calculation.gross_eur;
        displayData.platform_fee_eur = calculation.platform_fee_eur;
        displayData.net_eur = calculation.net_eur;
        displayData.gross_usd = calculation.gross_usd;
        displayData.platform_fee_usd = calculation.platform_fee_usd;
        displayData.net_usd = calculation.net_usd;
        displayData.local_gross = calculation.local_gross;
        displayData.local_fee = calculation.local_fee;
        displayData.local_net = calculation.local_net;
        displayData.currency = calculation.currency;
        displayData.currency_symbol = calculation.currency_symbol;
        displayData.breakdown = calculation.breakdown;
    }
    
    const isWithdrawButtonDisabled = isWithdrawing || displayAmount <= 0 || displayAmount > (earningsInfo?.available_diamonds || 0);

    const localCurrencySymbol = displayData.currency_symbol || 'R$';
    const isBankMethod = ((earningsInfo?.withdrawal_method || currentUser.withdrawal_method)?.method || '').toString().toLowerCase() === 'bank';

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
                        const c = displayCurrency === 'EUR'
                            ? { gross: displayData.gross_eur, fee: displayData.platform_fee_eur, net: displayData.net_eur, symbol: '€' }
                            : displayCurrency === 'USD'
                                ? { gross: displayData.gross_usd, fee: displayData.platform_fee_usd, net: displayData.net_usd, symbol: 'US$' }
                                : { gross: displayData.gross_brl, fee: displayData.platform_fee_brl, net: displayData.net_brl, symbol: 'R$' };
                        return (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#8a8894] font-bold text-[13px]">Valor Bruto ({displayCurrency})</span>
                                    <span className="text-white font-black text-[14px]">
                                        {formatCurrency(c.gross, c.symbol)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-[#8a8894] font-bold text-[13px]">Taxa de Saque (20%)</span>
                                    <span className="text-[#d97745] font-black text-[14px]">
                                        - {formatCurrency(c.fee, c.symbol)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-5 pb-1">
                                    <span className="text-white font-extrabold text-[15px]">Você Receberia</span>
                                    <span className="text-[#10b981] font-black text-[20px] tracking-tight">
                                        {formatCurrency(c.net, c.symbol)}
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
                                const methodName = method.method.toUpperCase();
                                let maskedDetails = '';
                                
                                if (method.method === 'mercado_pago' && method.details.email) {
                                    const email = method.details.email;
                                    const emailMatch = email.match(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)/);
                                    if (emailMatch) {
                                        const domain = emailMatch[2];
                                        maskedDetails = `*********@${domain}`;
                                    } else {
                                        maskedDetails = '***';
                                    }
                                } else if (method.method === 'pix' && method.details.pixKey) {
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
                                } else if (method.method === 'bank' && method.details.bankName) {
                                    maskedDetails = `•••• ${(method.details.accountHolder || '').toUpperCase() || '...'}`;
                                }
                                
                                return `${methodName === 'PIX' ? 'Pix' : methodName === 'BANK' ? 'Conta Bancária' : methodName}: ${maskedDetails}`;
                            })()
                            : 'Configurar Método'
                        }
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-[#4b4a52]" />
                </button>
                <p className="text-[10px] text-[#5c5966] text-center font-medium mt-3 leading-none">{isBankMethod ? `O valor será convertido e enviado para sua conta bancária (${localCurrencySymbol}).` : 'O valor será enviado para sua conta cadastrada.'}</p>
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
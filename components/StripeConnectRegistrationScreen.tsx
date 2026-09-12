import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User, ToastType } from '../types';
import { api } from '../services/api';
import { BrazilFlagIcon, PortugalFlagIcon, USAFlagIcon } from './icons';
import { LoadingSpinner } from './Loading';

interface StripeConnectRegistrationScreenProps {
    onClose: () => void;
    currentUser: User;
    addToast: (type: ToastType, message: string) => void;
}

const BackArrowIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-white">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const LockBadge = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

// Máscara simples de CPF: 000.000.000-00
const maskCpf = (v: string): string => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const isValidEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// ═══ Percentual usado pelo Stripe Connect para identificar o país da conta.
type CountryCode = 'BR' | 'US' | 'PT';

const COUNTRIES: { code: CountryCode; label: string; flag: React.ReactNode }[] = [
    { code: 'BR', label: 'Brasil', flag: <BrazilFlagIcon className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10 shrink-0" /> },
    { code: 'US', label: 'Estados Unidos', flag: <USAFlagIcon className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10 shrink-0" /> },
    { code: 'PT', label: 'Portugal', flag: <PortugalFlagIcon className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10 shrink-0" /> },
];

const COUNTRY_INFO: Record<CountryCode, { name: string; receive: string; docLabel: string; placeholder: string; fields: string[]; currency: string }> = {
    BR: {
        name: 'Brasil',
        receive: 'Pix · conta bancária em Real (BRL)',
        docLabel: 'CPF',
        placeholder: '000.000.000-00',
        fields: ['Chave Pix', 'Agência', 'Conta'],
        currency: 'Real (BRL)',
    },
    US: {
        name: 'Estados Unidos',
        receive: 'Conta bancária em Dólar (ACH)',
        docLabel: 'Documento (SSN ou EIN)',
        placeholder: '000-00-0000',
        fields: ['Routing Number', 'Account Number'],
        currency: 'Dólar (USD)',
    },
    PT: {
        name: 'Portugal',
        receive: 'Conta com IBAN em Euro (SEPA)',
        docLabel: 'Documento (NIF)',
        placeholder: '000000000',
        fields: ['IBAN', 'BIC/SWIFT'],
        currency: 'Euro (EUR)',
    },
};

/**
 * ═══ Cadastro de Conta de Recebimento — Stripe Connect ═══
 * O app coleta APENAS o documento + e-mail. Dados bancários (Pix/agência,
 * routing/ACH, IBAN) são preenchidos pelo usuário direto no formulário
 * oficial do Stripe conforme o PAÍS escolhido aqui — nada disso passa
 * pelo LiveGo (segurança e privacidade).
 */
const StripeConnectRegistrationScreen: React.FC<StripeConnectRegistrationScreenProps> = ({ onClose, currentUser, addToast }) => {
    const rawCountry = (currentUser.country || '').trim().toLowerCase();
    const detectCountry = (): CountryCode => {
        if (/us|usa|united states|estados unidos/.test(rawCountry)) return 'US';
        if (/pt|portugal/.test(rawCountry)) return 'PT';
        return 'BR';
    };

    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(detectCountry);
    const [email, setEmail] = useState<string>(currentUser.email || '');
    const [cpf, setCpf] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [connectActionUrl, setConnectActionUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stripeUrl, setStripeUrl] = useState<string | null>(null);
    const [keyboardBottom, setKeyboardBottom] = useState(0);
    const mainRef = useRef<HTMLDivElement>(null);
    const baselineRef = useRef(0);

    useEffect(() => {
        const refresh = () => {
            baselineRef.current = Math.max(
                baselineRef.current,
                document.documentElement?.clientHeight || 0,
                window.innerHeight || 0
            );
        };
        refresh();
        window.addEventListener('resize', refresh);
        return () => window.removeEventListener('resize', refresh);
    }, []);

    useEffect(() => {
        const vv = window.visualViewport as VisualViewport | undefined;
        if (!vv) return;

        const measure = () => {
            const baseline = baselineRef.current || window.innerHeight || 0;
            const nav = navigator as any;
            const rectH = nav?.virtualKeyboard?.boundingRect?.height;
            let kbH = Math.max(0, Math.round(baseline - (vv ? vv.height : baseline)));
            if (typeof rectH === 'number' && rectH > 0) {
                kbH = Math.round(rectH);
            }
            setKeyboardBottom((prev) => (Math.abs(prev - kbH) > 2 ? kbH : prev));
        };

        vv.addEventListener('resize', measure);
        vv.addEventListener('scroll', measure);
        const nav = navigator as any;
        const vk = nav?.virtualKeyboard;
        vk?.addEventListener?.('geometrychange', measure);

        return () => {
            vv.removeEventListener('resize', measure);
            vv.removeEventListener('scroll', measure);
            vk?.removeEventListener?.('geometrychange', measure);
        };
    }, []);

    const scrollToInput = useCallback((el: HTMLElement | null) => {
        if (!el || !mainRef.current) return;
        setTimeout(() => {
            const container = mainRef.current;
            if (!container) return;
            const inputTop = el.getBoundingClientRect().top;
            const containerTop = container.getBoundingClientRect().top;
            const scrollTarget = container.scrollTop + inputTop - containerTop - 16;
            container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
        }, 300);
    }, []);

    const countryInfo = COUNTRY_INFO[selectedCountry];

    const handleCountryChange = (code: CountryCode) => {
        setSelectedCountry(code);
        setError(null);
    };

    const handleSubmit = async () => {
        setError(null);
        setConnectActionUrl(null);

        if (!isValidEmail(email)) {
            setError('Digite um e-mail válido.');
            return;
        }
        const cpfDigits = cpf.replace(/\D/g, '');
        if (cpfDigits.length !== 11) {
            setError(`Digite o documento completo (apenas números) — conforme o país: ${countryInfo.docLabel}.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.stripeConnectOnboarding({ cpf: cpfDigits, email: email.trim(), country: selectedCountry });
            if (res.url) {
                setStripeUrl(res.url);
                window.open(res.url, '_blank', 'noopener,noreferrer');
            } else {
                throw new Error((res as any).error || 'Não foi possível gerar o cadastro. Tente novamente.');
            }
        } catch (e: any) {
            const data = e?.response?.data || {};
            const message = String(data?.error || e?.message || 'Falha ao iniciar o cadastro. Tente novamente.');
            setError(message);
            if (data?.connectNotEnabled) {
                setConnectActionUrl(data?.actionUrl || 'https://dashboard.stripe.com/connect');
            } else {
                addToast(ToastType.Error, message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="absolute inset-0 bg-[#09080b] z-50 flex flex-col text-[#e1e2eb] font-sans overflow-x-hidden select-text">

            <header className="flex items-center justify-between px-4 py-3 bg-[#09080b] flex-shrink-0 border-b border-white/[0.02]">
                <button onClick={onClose} className="p-1 hover:opacity-85 active:scale-95 transition-all outline-none" id="connect-reg-back">
                    <BackArrowIcon />
                </button>
                <div className="text-[15px] font-extrabold text-white tracking-tight">Cadastro de Conta</div>
                <div className="w-[26px]" />
            </header>

            <main ref={mainRef} className="flex-grow overflow-y-auto px-4 py-4 pb-10 w-full max-w-md mx-auto no-scrollbar space-y-4" style={{ paddingBottom: Math.max(40, keyboardBottom + 20) }}>

                {/* Selo de segurança */}
                <div className="bg-[#241a38] border border-[#7a3be9]/30 rounded-[14px] p-3.5 px-4 flex items-start space-x-2.5">
                    <LockBadge />
                    <div>
                        <p className="text-[12px] font-black text-white tracking-wide">Seus dados ficam direto com o Stripe</p>
                        <p className="text-[11px] text-[#a1a1aa] font-medium leading-snug mt-0.5">
                            O documento e a conta bancária (Pix/agência, Routing, IBAN) são preenchidos no formulário oficial do
                            Stripe — nada disso passa pela LiveGo. Tudo protegido pelo Stripe.
                        </p>
                    </div>
                </div>

                {/* Escolha do país de recebimento */}
                <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#8a8894] block ml-1 mb-2" id="connect-reg-country-label">
                        PAÍS DA CONTA DE RECEBIMENTO
                    </span>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="connect-reg-country-label">
                        {COUNTRIES.map((c) => {
                            const isActive = selectedCountry === c.code;
                            return (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => handleCountryChange(c.code)}
                                    role="radio"
                                    aria-checked={isActive}
                                    className={`flex flex-col items-center justify-center py-3 rounded-[14px] transition-all cursor-pointer select-none active:scale-[0.98] border ${
                                        isActive
                                            ? 'bg-[#241a38] border-[#7a3be9]/60 text-white'
                                            : 'bg-[#131215] border-[#27262a] text-[#8a8894] hover:bg-[#1a191d]'
                                    }`}
                                    id={`connect-reg-country-${c.code}`}
                                >
                                    <span className="mb-1.5">{c.flag}</span>
                                    <span className="text-[12px] font-black tracking-wide">{c.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* País e método de recebimento */}
                <div className="bg-[#141316] rounded-2xl p-4 flex items-center space-x-3">
                    {selectedCountry === 'BR' && <BrazilFlagIcon className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10 shrink-0" />}
                    {selectedCountry === 'US' && <USAFlagIcon className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10 shrink-0" />}
                    {selectedCountry === 'PT' && <PortugalFlagIcon className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10 shrink-0" />}
                    <div>
                        <p className="text-[13px] font-black text-white">{countryInfo.name}</p>
                        <p className="text-[11px] text-[#8a3ffc] font-bold mt-0.5">{countryInfo.receive}</p>
                    </div>
                </div>

                {/* Campos que o Stripe vai pedir neste país (só informativo — preenchidos lá, nunca aqui) */}
                <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#8a8894] mb-2">
                        Obrigatório no formulário do Stripe · {countryInfo.currency}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {countryInfo.fields.map((f) => (
                            <span key={f} className="text-[11px] font-bold text-white bg-[#241a38] border border-[#7a3be9]/30 rounded-full px-3 py-1.5">
                                {f}
                            </span>
                        ))}
                    </div>
                    <p className="text-[10px] text-[#5c5966] font-medium leading-snug mt-2.5">
                        Você digita esses dados na página oficial do Stripe que será aberta — a LiveGo nunca os armazena.
                    </p>
                </div>

                {stripeUrl ? (
                    <div className="bg-emerald-950/25 border border-emerald-500/25 rounded-[14px] p-4 space-y-3 mt-2">
                        <div className="flex items-center space-x-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-400">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <span className="text-[13px] font-black text-emerald-300 tracking-wide">Encaminhado para o Stripe</span>
                        </div>
                        <p className="text-[11px] text-[#a1a1aa] font-medium leading-snug">
                            Complete o cadastro na página oficial do Stripe que abrimos: envie o documento, informe os dados
                            bancários do país ({countryInfo.receive.toLowerCase()}) e conclua a verificação. Quando terminar,
                            volte e os saques serão liberados automaticamente.
                        </p>
                        <button
                            onClick={() => window.open(stripeUrl, '_blank', 'noopener,noreferrer')}
                            className="w-full bg-[#7a3be9] hover:bg-[#6b2ed3] text-white font-black py-3 rounded-[12px] transition-all cursor-pointer text-[13px] tracking-wide select-none active:scale-[0.99]"
                        >
                            Abrir página do Stripe novamente
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full bg-[#141316] text-white font-bold py-3 rounded-[12px] transition-all cursor-pointer text-[13px] tracking-wide select-none"
                            id="connect-reg-back-to-ganhos"
                        >
                            Voltar para os Ganhos
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3.5 mt-1">
                            <div>
                                <label className="text-[11px] font-black uppercase tracking-wider text-[#8a8894] block ml-1 mb-1.5" htmlFor="connect-reg-email">
                                    E-MAIL
                                </label>
                                <input
                                    id="connect-reg-email"
                                    type="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="voce@email.com"
                                    onFocus={(e) => scrollToInput(e.target as HTMLElement)}
                                    className="w-full bg-[#131215] text-white placeholder-gray-600 rounded-[14px] p-3 px-4 font-semibold text-[15px] border border-[#27262a] focus:border-[#8a3ffc]/50 focus:outline-none transition-all h-[52px]"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-black uppercase tracking-wider text-[#8a8894] block ml-1 mb-1.5" htmlFor="connect-reg-cpf">
                                    {countryInfo.docLabel.toUpperCase()}
                                </label>
                                <input
                                    id="connect-reg-cpf"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    value={cpf}
                                    onChange={(e) => setCpf(maskCpf(e.target.value))}
                                    placeholder={countryInfo.placeholder}
                                    onFocus={(e) => scrollToInput(e.target as HTMLElement)}
                                    className="w-full bg-[#131215] text-white placeholder-gray-600 rounded-[14px] p-3 px-4 font-semibold text-[15px] border border-[#27262a] focus:border-[#8a3ffc]/50 focus:outline-none transition-all h-[52px] tracking-wider"
                                />
                            </div>

                            <p className="text-[10px] text-[#5c5966] font-medium leading-snug px-1">
                                &#9432; Apenas essas duas informações ficam aqui. O documento (original) e a conta bancária
                                ({countryInfo.fields.join(', ')}) são enviados direto para a Stripe, na próxima etapa.
                            </p>

                            {error && (
                                <div className="bg-rose-950/30 border border-rose-500/25 rounded-[12px] p-3">
                                    <p className="text-[12px] font-bold text-rose-300 leading-snug">{error}</p>
                                    {connectActionUrl && (
                                        <>
                                            <p className="text-[11px] text-[#a1a1aa] font-medium mt-1.5 leading-snug">
                                                O Stripe Connect precisa ser ativado pela administração da plataforma para liberar o cadastro de contas.
                                            </p>
                                            <button
                                                onClick={() => window.open(connectActionUrl, '_blank', 'noopener,noreferrer')}
                                                className="mt-2 text-[12px] font-black text-[#8a3ffc] underline"
                                            >
                                                Abrir painel do Stripe
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full bg-[#7a3be9] hover:bg-[#6b2ed3] text-white font-black py-[18px] rounded-[16px] transition-all cursor-pointer text-[15px] tracking-wide select-none active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                                id="connect-reg-submit"
                            >
                                {isSubmitting ? (
                                    <span className="inline-flex items-center justify-center space-x-2">
                                        <LoadingSpinner />
                                        <span>Gerando cadastro...</span>
                                    </span>
                                ) : (
                                    'Continuar para o Stripe'
                                )}
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default StripeConnectRegistrationScreen;
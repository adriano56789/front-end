import React from 'react';
import { useTranslation } from '../../i18n';

// Crisp `<` Chevron Left Back Icon matching standard design precisely
const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={2.4} 
    stroke="currentColor" 
    className="w-5 h-5 text-white"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const EarningsInfoScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-full bg-black select-none text-white relative font-sans overflow-hidden min-h-screen">
            {/* Header with back icon and title */}
            <header className="flex items-center px-4 py-5 z-10 flex-shrink-0 relative">
                <button 
                    onClick={onBack} 
                    className="p-2 -ml-2 rounded-full hover:bg-white/[0.05] active:scale-95 transition-all text-white"
                    title="Voltar"
                >
                    <ChevronLeftIcon />
                </button>
                <span className="ml-[10px] text-[18px] font-semibold text-white tracking-wide">
                    {t('settings.earnings.title') || 'Informações de Ganhos'}
                </span>
            </header>

            {/* Scrollable Main Content */}
            <main className="flex-grow overflow-y-auto no-scrollbar px-5 py-2 z-10 space-y-6 pb-20">
                {/* Big Display Title */}
                <div>
                    <h1 className="text-[26px] md:text-[28px] font-bold text-white tracking-normal leading-tight mt-2 mb-6">
                        {t('settings.earnings.policyTitle') || 'Nossa Política de Ganhos'}
                    </h1>
                </div>

                {/* Section 1: Conversão */}
                <div className="space-y-2">
                    <h2 className="text-[17px] font-semibold text-white tracking-wide">
                        {t('settings.earnings.conversionTitle') || 'Conversão de Ganhos para Dinheiro'}
                    </h2>
                    <p className="text-[14px] text-zinc-400 font-normal leading-relaxed">
                        {t('settings.earnings.conversionBody') || "A conversão dos seus 'Ganhos' acumulados na plataforma para Reais (BRL) é totalmente gratuita. Não há nenhuma taxa oculta neste processo. Seu saldo de Ganhos é convertido usando a taxa de câmbio atual da plataforma."}
                    </p>
                </div>

                {/* Section 2: Taxa de Saque */}
                <div className="space-y-3">
                    <div className="space-y-2">
                        <h2 className="text-[17px] font-semibold text-white tracking-wide">
                            {t('settings.earnings.feeTitle') || 'Taxa de Saque'}
                        </h2>
                        <p className="text-[14px] text-zinc-400 font-normal leading-relaxed">
                            {t('settings.earnings.feeBody') || 'Quando você solicita um saque, uma taxa de serviço é aplicada para cobrir os custos operacionais e de processamento de pagamento. A divisão é transparente:'}
                        </p>
                    </div>

                    {/* Cards container */}
                    <div className="space-y-4 pt-2">
                        {/* Gold Card: 80% for Streamer */}
                        <div className="border border-[#C5A880]/30 bg-[#1C1F26]/60 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-2xl">
                            <h3 className="text-[17px] font-bold text-[#E7C594] tracking-wide mb-3 pb-3 border-b border-[#C5A880]/15">
                                {t('settings.earnings.streamerShareTitle') || '80% para Você (Streamer)'}
                            </h3>
                            <p className="text-[14px] text-zinc-300 font-light leading-relaxed">
                                {t('settings.earnings.streamerShareBody') || 'A maior parte do valor é sua! Acreditamos em recompensar nossos criadores de conteúdo.'}
                            </p>
                        </div>

                        {/* Dark Card: 20% for Platform */}
                        <div className="border border-white/[0.04] bg-[#1C1F26]/40 rounded-2xl p-5 shadow-md relative overflow-hidden backdrop-blur-md">
                            <h3 className="text-[17px] font-bold text-zinc-100 tracking-wide mb-3">
                                {t('settings.earnings.platformShareTitle') || '20% para a Plataforma'}
                            </h3>
                            <p className="text-[14px] text-zinc-400 font-light leading-relaxed">
                                {t('settings.earnings.platformShareBody') || 'Esta taxa nos ajuda a manter a plataforma segura, desenvolver novos recursos e oferecer suporte à comunidade.'}
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EarningsInfoScreen;

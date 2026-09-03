import React, { useMemo, useState, useCallback } from 'react';
import { BackIcon, GoldCoinWithGIcon, BankIcon } from './icons';
import { useTranslation } from '../i18n';
import { PurchaseRecord } from '../types';
import { api } from '../services/api';

interface PurchaseHistoryScreenProps {
  onClose: () => void;
  history: PurchaseRecord[];
}

type FilterType = 'all' | 'Concluído' | 'Pendente' | 'Cancelado';

const SmallBlueDiamondIcon = () => (
  <svg className="w-5 h-5 text-cyan-400 drop-shadow-[0_1px_4px_rgba(34,211,238,0.52)]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <polygon points="12,2 4,10 12,22 20,10" />
    <polygon points="12,2 8,10 12,22" fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.4" />
  </svg>
);

const ThumbnailPreview: React.FC<{ type: string; description: string }> = ({ type, description }) => {
  const lowercaseDesc = description.toLowerCase();
  
  if (lowercaseDesc.includes('quadro') || type === 'purchase_frame') {
    if (lowercaseDesc.includes('real')) {
      // Golden Crown Frame
      return (
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center relative overflow-hidden ring-1 ring-white/[0.04]">
          <svg className="w-12 h-12 relative z-10 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" viewBox="0 0 100 100" fill="none">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#ca8a04" />
                <stop offset="65%" stopColor="#ca8a04" />
                <stop offset="100%" stopColor="#854d0e" />
              </linearGradient>
            </defs>
            {/* Multiple rings of golden details */}
            <circle cx="50" cy="50" r="32" stroke="url(#goldGrad)" strokeWidth="4.5" />
            <circle cx="50" cy="50" r="26" stroke="#111" strokeWidth="2" />
            <circle cx="50" cy="50" r="24" stroke="url(#goldGrad)" strokeWidth="1.5" />
            
            {/* Ornate crowns or leaves outside the frame */}
            {Array.from({ length: 8 }).map((_, i) => (
              <g key={i} transform={`rotate(${i * 45} 50 50)`}>
                <polygon points="50,11 44,18 56,18" fill="url(#goldGrad)" />
                <circle cx="50" cy="9" r="2.5" fill="#fef08a" />
              </g>
            ))}
            
            {/* Ornate interior dash */}
            <circle cx="50" cy="50" r="17" stroke="url(#goldGrad)" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
          <div className="absolute inset-1.5 rounded-full border border-yellow-500/[0.08] pointer-events-none"></div>
        </div>
      );
    } else {
      // Silver Frame
      return (
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center relative overflow-hidden ring-1 ring-white/[0.04]">
          <svg className="w-12 h-12 relative z-10 drop-shadow-[0_0_8px_rgba(161,161,170,0.5)]" viewBox="0 0 100 100" fill="none">
            <defs>
              <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#cbd5e1" />
                <stop offset="70%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
            </defs>
            {/* Silver Square frame */}
            <rect x="20" y="20" width="60" height="60" rx="8" stroke="url(#silverGrad)" strokeWidth="5.5" />
            <rect x="25" y="25" width="50" height="50" rx="5" stroke="#111" strokeWidth="2" />
            <rect x="27" y="27" width="46" height="46" rx="4" stroke="url(#silverGrad)" strokeWidth="1.5" />
            
            {/* Decorative corners for Avatar Nobre */}
            <rect x="15" y="15" width="14" height="14" rx="3" fill="url(#silverGrad)" />
            <rect x="71" y="15" width="14" height="14" rx="3" fill="url(#silverGrad)" />
            <rect x="15" y="71" width="14" height="14" rx="3" fill="url(#silverGrad)" />
            <rect x="71" y="71" width="14" height="14" rx="3" fill="url(#silverGrad)" />
            
            {/* Tiny glowing white diamond inside corner elements */}
            <polygon points="22,17 26,22 22,27 18,22" fill="#fff" />
            <polygon points="78,17 82,22 78,27 74,22" fill="#fff" />
            <polygon points="22,73 26,78 22,83 18,78" fill="#fff" />
            <polygon points="78,73 82,78 78,83 74,78" fill="#fff" />
          </svg>
          <div className="absolute inset-1.5 rounded-lg border border-slate-400/[0.08] pointer-events-none"></div>
        </div>
      );
    }
  }

  // Otherwise, Diamond Package bundle
  return (
    <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center relative overflow-hidden ring-1 ring-white/[0.04]">
      <svg className="w-11 h-11 relative z-10 drop-shadow-[0_0_10px_rgba(219,39,119,0.52)]" viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="purpleGem" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="30%" stopColor="#db2777" />
            <stop offset="70%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7c3ff5" />
          </linearGradient>
          <linearGradient id="gemBack" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fdf2f8" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
        </defs>
        {/* Cluster of glowing diamonds */}
        <path d="M22 55 L38 35 L54 55 L38 72 Z" fill="url(#gemBack)" opacity="0.8" />
        <path d="M46 55 L62 35 L78 55 L62 72 Z" fill="url(#gemBack)" opacity="0.8" />
        
        <path d="M30 45 L50 20 L70 45 L50 64 Z" fill="url(#purpleGem)" />
        <polygon points="50,20 44,45 50,64" fill="#fdf2f8" opacity="0.3" />
        <polygon points="50,20 56,45 50,64" fill="#a21caf" opacity="0.2" />
        
        <g stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
          <line x1="18" y1="36" x2="18" y2="44" />
          <line x1="14" y1="40" x2="22" y2="40" />
          
          <line x1="82" y1="32" x2="82" y2="40" />
          <line x1="78" y1="36" x2="86" y2="36" />
        </g>
        <circle cx="18" cy="40" r="1" fill="#fff" />
        <circle cx="82" cy="36" r="1" fill="#fff" />
      </svg>
      <div className="absolute inset-1.5 rounded-full bg-pink-500/5 blur-md pointer-events-none"></div>
    </div>
  );
};

const formatPortugueseDate = (timestamp: any) => {
  try {
    let dateVal = timestamp;
    if (timestamp && typeof timestamp === 'object') {
      if ('$date' in timestamp) {
        dateVal = timestamp.$date;
      } else if ('date' in timestamp) {
        dateVal = timestamp.date;
      } else {
        return JSON.stringify(timestamp);
      }
    }
    
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) {
      return typeof timestamp === 'object' ? JSON.stringify(timestamp) : String(timestamp);
    }
    
    // Day format
    const day = date.getDate();
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const month = months[date.getMonth()];
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day} de ${month}, ${hours}:${minutes}`;
  } catch (e) {
    return typeof timestamp === 'object' ? JSON.stringify(timestamp) : String(timestamp);
  }
};

const StatusBadge: React.FC<{ item: PurchaseRecord }> = ({ item }) => {
    const status = item.status;
    if (status === 'Concluído') {
      return (
        <span className="bg-[#10b981]/10 border border-[#10b981]/25 text-[#10b981] text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center space-x-1 tracking-wide shadow-[0_1px_4px_rgba(16,185,129,0.12)] leading-none">
          <span>Sucesso</span>
          <svg className="w-3.5 h-3.5 text-[#10b981]" fill="currentColor" viewBox="0 0 20 20">
             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </span>
      );
    }
    
    if (status === 'Pendente') {
      const isDiamonds = item.type === 'purchase_diamonds';
      const label = isDiamonds ? 'Aguardando Pagamento' : 'Pendente';
      return (
        <span className="bg-[#facc15] text-[#111216] text-[11px] font-black px-3 py-1 rounded-full flex items-center justify-center tracking-tight shadow-[0_1px_5px_rgba(250,204,21,0.25)] leading-none">
          <span>{label}</span>
        </span>
      );
    }

    return (
      <span className="bg-rose-950/40 border border-rose-500/20 text-rose-400 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 tracking-wide shadow-[0_1px_3px_rgba(239,68,68,0.1)] leading-none">
        <span>Cancelado</span>
        <svg className="w-3.5 h-3.5 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 00-1.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </span>
    );
};

const HistoryCardItem: React.FC<{ item: PurchaseRecord; onEstorno: (item: PurchaseRecord) => void }> = ({ item, onEstorno }) => {
    const isFrame = item.type === 'purchase_frame' || item.description.toLowerCase().includes('quadro');
    const isPurchase = item.type === 'purchase_diamonds';
    const canEstorno = isPurchase && item.status === 'Concluído';

    const getAmountDisplay = () => {
        if (isFrame) {
            return (
                <div className="flex flex-col items-end">
                    <span className="font-semibold text-[17px] text-[#818cf8] flex items-center space-x-1 tracking-tight">
                        <SmallBlueDiamondIcon />
                        <span className="-mr-0.5">{item.amountCoins.toLocaleString('pt-BR')}</span>
                    </span>
                    <span className="text-[11px] font-bold text-[#818cf8]/80 tracking-wide mt-[-2px]">Diamantes</span>
                </div>
            );
        }
        if (isPurchase) {
             return <span className="font-extrabold text-[16px] sm:text-[18px] text-[#a1a1aa] tracking-tight">R$ {item.amountBRL.toFixed(2).replace('.', ',')}</span>;
        }
        return <span className="font-extrabold text-[16px] sm:text-[18px] text-[#a1a1aa] tracking-tight">R$ {item.amountBRL.toFixed(2).replace('.', ',')}</span>;
    };

    return (
        <div className="bg-[#111216] border border-[#202128] p-3.5 rounded-2xl shadow-xl transition-all hover:bg-[#14151b] hover:border-white/[0.04] flex items-center justify-between space-x-3">
            {/* Left box containing custom asset */}
            <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                <ThumbnailPreview type={item.type} description={item.description} />
                
                {/* Details Column */}
                <div className="flex flex-col space-y-1 min-w-0">
                    <span className="font-black text-white text-[15px] sm:text-[16px] tracking-tight truncate leading-tight">{item.description}</span>
                    <span className="text-[11px] sm:text-[12px] font-semibold text-gray-400 truncate leading-none">
                        {formatPortugueseDate(item.timestamp)}
                    </span>
                </div>
            </div>
            
            {/* Right side containing value display and status badge underneath */}
            <div className="flex flex-col items-end justify-center space-y-2 shrink-0">
                {getAmountDisplay()}
                <StatusBadge item={item} />
                {canEstorno && (
                    <button
                        onClick={() => onEstorno(item)}
                        className="text-[10px] font-black uppercase tracking-wider text-[#7a3be9] bg-[#241a38] hover:bg-[#2c2045] px-3 py-1.5 rounded-full transition-all cursor-pointer active:scale-95"
                        id={`btn-estorno-${item.id}`}
                    >
                        Solicitar Estorno
                    </button>
                )}
            </div>
        </div>
    );
};

const PurchaseHistoryScreen: React.FC<PurchaseHistoryScreenProps> = ({ onClose, history }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = React.useState<FilterType>('all');

  // ─── Estado do estorno ───
  const [estornoItem, setEstornoItem] = useState<PurchaseRecord | null>(null);
  const [reasons, setReasons] = useState<Record<string, string> | null>(null);
  const [reasonCode, setReasonCode] = useState<string>('');
  const [reasonDetail, setReasonDetail] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openEstorno = useCallback(async (item: PurchaseRecord) => {
    setEstornoItem(item);
    setReasonCode('');
    setReasonDetail('');
    setResultMsg(null);
    setErrorMsg(null);
    try {
      const data = await api.getEstornoReasons();
      setReasons(data.reasons || {});
    } catch (e: any) {
      setErrorMsg(e?.message || 'Não foi possível carregar os motivos.');
    }
  }, []);

  const closeEstorno = useCallback(() => {
    setEstornoItem(null);
    setSubmitting(false);
  }, []);

  const submitEstorno = useCallback(async () => {
    if (!estornoItem || !reasonCode) {
      setErrorMsg('Selecione um motivo.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    setResultMsg(null);
    try {
      // Toda chamada passa por api.ts (nada de fetch direto)
      const data = await api.requestEstorno(estornoItem.id, reasonCode, reasonDetail || undefined);
      setResultMsg('Estorno solicitado. O valor correspondente ficou bloqueado na carteira da host por até 7 dias enquanto o banco confirma.');
      setReasonCode('');
      setReasonDetail('');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Falha ao solicitar estorno.');
    } finally {
      setSubmitting(false);
    }
  }, [estornoItem, reasonCode, reasonDetail]);

  // Sort real dynamic custom records by timestamp descending
  const sortedHistory = useMemo(() => {
    const getMs = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'object') {
        if ('$date' in val) {
          return new Date(val.$date).getTime() || 0;
        }
        if ('date' in val) {
          return new Date(val.date).getTime() || 0;
        }
        return 0;
      }
      return new Date(val).getTime() || 0;
    };
    return [...(history || [])].sort((a, b) => getMs(b.timestamp) - getMs(a.timestamp));
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (filter === 'all') return sortedHistory;
    return sortedHistory.filter(item => item.status === filter);
  }, [sortedHistory, filter]);
  
  const TabButton: React.FC<{ label: string; type: FilterType }> = ({ label, type }) => {
    const isActive = filter === type;
    
    // Custom gradient transitions for premium visual feedback on active selection
    const getActiveStyles = () => {
      switch (type) {
        case 'Concluído':
          return 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] border border-[#34d399]/20 scale-[1.03]';
        case 'Pendente':
          return 'bg-gradient-to-r from-[#7c3ff5] to-[#8a3ffc] text-white shadow-[0_0_15px_rgba(124,63,245,0.45)] scale-[1.03] border border-[#a78bfa]/25';
        case 'Cancelado':
          return 'bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white shadow-[0_0_12px_rgba(239,68,68,0.35)] border border-[#fca5a5]/20 scale-[1.03]';
        default: // 'all' - Todos
          return 'bg-gradient-to-r from-[#5a36f4] to-[#7f00ff] text-white shadow-[0_0_15px_rgba(122,34,255,0.45)] scale-[1.03] border border-[#b49cfc]/25';
      }
    };

    return (
      <button
        onClick={() => setFilter(type)}
        className={`px-4 sm:px-5 py-2 text-[13px] sm:text-[14px] font-black rounded-full transition-all duration-300 outline-none cursor-pointer whitespace-nowrap ${
          isActive 
            ? getActiveStyles()
            : 'bg-[#18191d] text-[#a1a1aa] border border-[#202128] hover:text-white hover:bg-[#20222a] hover:border-zinc-700/60 active:scale-95'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col text-white font-sans selection:bg-[#7c3ff5]/30">
      <style>{`
        @keyframes hologramFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.02);
          }
        }
        @keyframes hologramPulse {
          0%, 100% {
            opacity: 0.15;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.35;
            transform: scale(1.15);
          }
        }
        .animate-hologram-float {
          animation: hologramFloat 4.5s ease-in-out infinite;
        }
        .animate-hologram-pulse {
          animation: hologramPulse 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* Header Container */}
      <header className="px-5 pt-6 pb-2 flex items-center justify-between relative flex-shrink-0">
        {/* Back Button */}
        <button 
          onClick={onClose} 
          className="absolute left-5 top-7 p-1 text-white/95 hover:text-white hover:scale-105 active:scale-95 transition-all outline-none"
          aria-label="Voltar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Big Large Title Exactly matching screenshot alignment */}
        <h1 className="text-[20px] sm:text-[22px] font-black tracking-tight text-white mx-auto text-center font-sans leading-tight mt-1 whitespace-pre-line">
          Histórico de Diamantes{'\n'}e Quadros
        </h1>
        
        {/* Balanced spacer so title centers perfectly */}
        <div className="w-[28px] h-[28px] absolute right-5"></div>
      </header>

      <main className="flex-grow p-5 pt-3 flex flex-col overflow-hidden">
        {/* Filter Tab Row */}
        <div className="flex-shrink-0 mb-6 overflow-x-auto no-scrollbar flex items-center space-x-2 pb-1">
            <TabButton label="Todos" type="all" />
            <TabButton label="Concluído" type="Concluído" />
            <TabButton label="Pendente" type="Pendente" />
            <TabButton label="Cancelado" type="Cancelado" />
        </div>
        
        {/* Content Area */}
        {filteredHistory.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center px-4 -mt-10">
                {/* Stunning 3D Holographic Purple Shopping Bag and Receipt Illustration */}
                <div className="relative w-[210px] h-[210px] flex items-center justify-center mb-6">
                    {/* Shadow & Aura Glow under */}
                    <div className="absolute w-[120px] h-[120px] bg-[#9333ea] rounded-full blur-[45px] opacity-15 animate-hologram-pulse"></div>
                    
                    {/* Floating holographic elements */}
                    <svg viewBox="0 0 200 200" className="w-full h-full animate-hologram-float drop-shadow-[0_0_25px_rgba(147,51,234,0.45)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Handles of shopping bag */}
                        <path d="M85 75 C85 58, 115 58, 115 75" stroke="url(#holographicGrad)" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
                        <path d="M90 75 C90 63, 110 63, 110 75" stroke="url(#holographicGrad)" strokeWidth="4" strokeLinecap="round" />
                        
                        {/* Holographic Glowing Bag Base */}
                        <path d="M72 75 H128 L136 142 H64 L72 75 Z" fill="url(#purpleGlass)" stroke="url(#holographicGrad)" strokeWidth="2" strokeLinejoin="round" />
                        
                        {/* Highlights & reflections on bag to look glassmorphic */}
                        <path d="M75 78 L78 138" stroke="#f0abfc" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
                        <path d="M72 75 L64 142" stroke="url(#holographicGrad)" strokeWidth="1.5" opacity="0.4" />
                        <path d="M128 75 L136 142" stroke="url(#holographicGrad)" strokeWidth="1.5" opacity="0.4" />

                        {/* Floating curling glowing receipt starting from inside of bag */}
                        <path d="M90 85 Q71 85, 74 100 T87 122 T56 148 T70 168 T52 173" fill="url(#receiptGlass)" stroke="url(#holographicGrad)" strokeWidth="2.5" strokeLinejoin="round" />
                        
                        {/* Receipt horizontal dashed purchase lines */}
                        <line x1="77" y1="99" x2="88" y2="99" stroke="#fae8ff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                        <line x1="79" y1="108" x2="87" y2="108" stroke="#fae8ff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                        <line x1="74" y1="117" x2="84" y2="117" stroke="#fae8ff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                        
                        <line x1="68" y1="126" x2="78" y2="126" stroke="#f5d0fe" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                        <line x1="65" y1="134" x2="75" y2="134" stroke="#f5d0fe" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                        <line x1="61" y1="142" x2="71" y2="142" stroke="#f5d0fe" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                        
                        <line x1="60" y1="151" x2="68" y2="151" stroke="#f1c0fc" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                        <line x1="58" y1="159" x2="65" y2="159" stroke="#f1c0fc" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

                        <defs>
                            <linearGradient id="holographicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#f0abfc" />
                                <stop offset="50%" stopColor="#c084fc" />
                                <stop offset="100%" stopColor="#818cf8" />
                            </linearGradient>
                            <linearGradient id="purpleGlass" x1="50%" y1="0%" x2="50%" y2="100%">
                                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.32" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.04" />
                            </linearGradient>
                            <linearGradient id="receiptGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#fae8ff" stopOpacity="0.48" />
                                <stop offset="50%" stopColor="#f5d0fe" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.05" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                <h2 className="text-[20px] font-black tracking-tight text-white mb-2 leading-none">
                    Nenhum histórico encontrado.
                </h2>
                <p className="text-[14px] text-gray-500 font-medium">
                    Suas transações filtradas aparecerão aqui.
                </p>
            </div>
        ) : (
            <div className="flex-grow overflow-y-auto no-scrollbar space-y-3.5 pr-1">
                {filteredHistory.map(item => <HistoryCardItem key={item.id} item={item} onEstorno={openEstorno} />)}
            </div>
        )}
      </main>

      {/* ─── Modal de Estorno ─── */}
      {estornoItem && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-5">
          <div className="bg-[#141316] border border-[#27262a] rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-black text-white tracking-tight">Solicitar Estorno</h3>
              <button onClick={closeEstorno} className="text-[#8a8894] hover:text-white text-[20px] leading-none cursor-pointer" aria-label="Fechar">×</button>
            </div>

            <p className="text-[12px] text-[#a1a1aa] font-medium leading-snug mb-4">
              Ao solicitar, o valor correspondente fica bloqueado na carteira da host por até 7 dias enquanto
              o banco confirma com a plataforma. Só há devolução se a fraude for comprovada.
            </p>

            {errorMsg && !resultMsg && (
              <div className="text-[12px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 mb-3">{errorMsg}</div>
            )}
            {resultMsg && (
              <div className="text-[12px] text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl px-3 py-2 mb-3">{resultMsg}</div>
            )}

            {!resultMsg ? (
              <>
                <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-[#8a8894]">Motivo (causa)</div>
                <div className="space-y-2 mb-4 max-h-56 overflow-y-auto no-scrollbar pr-1">
                  {reasons && Object.entries(reasons).map(([code, label]) => (
                    <button
                      key={code}
                      onClick={() => { setReasonCode(code); setErrorMsg(null); }}
                      className={`w-full text-left text-[13px] font-bold px-3 py-2.5 rounded-xl transition-all cursor-pointer border ${
                        reasonCode === code
                          ? 'bg-[#7a3be9]/15 border-[#7a3be9]/50 text-white'
                          : 'bg-[#18191d] border-[#27262a] text-[#a1a1aa] hover:border-[#4b4a52]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {reasonCode === 'other' && (
                  <input
                    value={reasonDetail}
                    onChange={(e) => setReasonDetail(e.target.value)}
                    placeholder="Descreva o motivo..."
                    className="w-full bg-[#131215] text-white placeholder-gray-600 rounded-xl p-3 text-[13px] border border-[#27262a] focus:border-[#8a3ffc]/50 focus:outline-none mb-4"
                  />
                )}

                <button
                  onClick={submitEstorno}
                  disabled={submitting || !reasonCode}
                  className="w-full bg-[#7a3be9] hover:bg-[#6b2ed3] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3 rounded-[14px] transition-all cursor-pointer text-[14px] tracking-wide active:scale-[0.99]"
                >
                  {submitting ? 'Enviando...' : 'Confirmar Estorno'}
                </button>
              </>
            ) : (
              <button
                onClick={closeEstorno}
                className="w-full bg-[#27262a] hover:bg-[#33323a] text-white font-black py-3 rounded-[14px] transition-all cursor-pointer text-[14px] tracking-wide"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistoryScreen;

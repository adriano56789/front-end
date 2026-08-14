import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon } from '../icons';
import { api } from '../../services/api';
import { BeautySettings, User, ToastType } from '../../types';
import { videoProcessor, DEFAULT_BEAUTY_SETTINGS, BeautyEffectSettings } from '../../services/VideoProcessor';
import { beautyWebRTCIntegration } from '../../services/BeautyWebRTCIntegration';

// Custom SVGs for Beauty Effects (Pixel Perfect match with screenshot)
const WhitenIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 10C21.5 10 16 16.5 16 26.5C16 38.5 22.5 45.5 32 45.5C41.5 45.5 48 38.5 48 26.5C48 16.5 42.5 10 32 10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 27C25.5 28.5 27.5 28.5 29 27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M35 27C36.5 28.5 38.5 28.5 40 27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M28 36C29.5 37.5 32.5 37.5 34 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M43 38L44.5 41L47.5 42.5L44.5 44L43 47L41.5 44L38.5 42.5L41.5 41L43 38Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const SmoothIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 36C18 36 22 40 28 40C34 40 38 36 44 36C50 36 52 38 52 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M12 44C18 44 22 48 28 48C34 48 38 44 44 44C50 44 52 46 52 46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 14C32 14 24 23 24 27C24 31.4 27.6 35 32 35C36.4 35 40 31.4 40 27C40 23 32 14 32 14Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M35 25C35 23.5 34.5 22 34 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BlushIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="blushGlow" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#ffb1b1" />
        <stop offset="50%" stopColor="#e11d48" />
        <stop offset="100%" stopColor="#4c0519" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="20" fill="url(#blushGlow)" stroke="#f43f5e" strokeWidth="1.5" />
    <path d="M42 22C46 27 46 37 42 42C38 38 38 26 42 22Z" fill="white" fillOpacity="0.25" />
  </svg>
);

const ContrastIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2.5" />
    <path d="M32 12C21 12 21 52 32 52V12Z" fill="currentColor" />
  </svg>
);

const BabyFaceIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8C19.5 8 10 17.5 10 30C10 42.5 19.5 56 32 56C44.5 56 54 42.5 54 30C54 17.5 44.5 8 32 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 26C24.5 27.5 26.5 27.5 28 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M36 26C37.5 27.5 39.5 27.5 41 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M27 37C29 39.5 35 39.5 37 37" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="22" cy="33" r="2.5" fill="#fda4af" />
    <circle cx="42" cy="33" r="2.5" fill="#fda4af" />
    <path d="M32 12C32 12 28 16 28 19C28 21 30 22 32 22C34 22 36 21 36 19C36 16 32 12 32 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LockIconCustom = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const TeethWhiteningIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 32C16 24 24 20 32 20C40 20 48 24 48 32C48 38 44 44 40 44C37 44 36 40 32 40C28 40 27 44 24 44C20 44 16 38 16 32Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 20V14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M24 34L29 31L32 34L35 30L40 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LipFillIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 30C24 22 40 22 48 30C44 34 36 36 32 36C28 36 20 34 16 30Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 36C38 40 44 40 48 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 44V40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const LipAugmentIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 30C24 24 40 24 48 30C44 34 36 36 32 36C28 36 20 34 16 30Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 36C38 40 44 40 48 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M10 30L4 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M54 30L60 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M12 26L6 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M52 26L58 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const SmileIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 32C20 24 28 18 32 18C36 18 44 24 44 32C44 38 38 42 32 42C26 42 20 38 20 32Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 32C28 36 36 36 40 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M20 24L14 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M44 24L50 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const BrowThicknessIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 24C18 18 28 18 32 20C36 18 46 18 52 24" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const BrowCurveIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 28C18 20 26 16 32 18C38 16 46 20 52 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M14 22L8 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M50 22L56 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const BrowDefinitionIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 26C18 20 28 20 32 22C36 20 46 20 52 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M14 30C20 26 26 26 30 27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M34 27C38 26 44 26 50 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const WrinkleIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 24C18 21 22 21 24 24C26 27 30 27 32 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M16 34C18 31 22 31 24 34C26 37 30 37 32 34C34 31 38 31 40 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M16 44C18 41 22 41 24 44C26 47 30 47 32 44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M44 40L48 44L44 48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DarkCircleIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 32C16 22 24 14 32 14C40 14 48 22 48 32C48 42 40 50 32 50C24 50 16 42 16 32Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 40C22 46 26 50 32 50C38 50 42 46 44 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 14V6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 22C28 22 25 25 25 29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const JawChinIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 12C14 22 12 32 12 40C12 48 18 54 32 54C46 54 52 48 52 40C52 32 50 22 46 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 22C22 22 18 30 18 38C18 44 22 50 32 50C42 50 46 44 46 38C46 30 42 22 32 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M28 26C26 29 26 33 27 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M36 26C38 29 38 33 37 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 38V46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EyeRefineIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 32C14 22 22 16 32 16C42 16 50 22 56 32C50 42 42 48 32 48C22 48 14 42 8 32Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="32" cy="32" r="7" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="32" cy="32" r="2.5" fill="currentColor" />
    <path d="M42 12L44 8L46 12L50 10L48 14L52 16L48 18L50 22L46 20L44 24L42 20L38 22L40 18L36 16L40 14L38 10L42 12Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const NoseIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 12C26 24 24 34 24 40C24 48 28 54 32 54C36 54 40 48 40 40C40 34 38 24 36 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 40C22 46 26 50 32 50C38 50 42 46 42 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 34L10 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M50 34L54 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 12V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const AcneIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 10C20 10 14 18 14 30C14 42 20 54 32 54C44 54 50 42 50 30C50 18 44 10 32 10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="28" r="3" fill="#f43f5e" stroke="none" />
    <circle cx="41" cy="33" r="2.5" fill="#7c3aed" stroke="none" />
    <circle cx="27" cy="40" r="2" fill="#f59e0b" stroke="none" />
    <path d="M46 44L52 40L50 46L56 44L52 50L58 52L52 54L50 60L46 56L40 58L42 52L36 54L40 48L34 46L40 44L38 38L44 42Z" fill="currentColor" />
  </svg>
);

const ShineIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 10C20 10 14 18 14 30C14 42 20 54 32 54C44 54 50 42 50 30C50 18 44 10 32 10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 24C26 24 24 29 24 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M42 40L48 36L46 42L52 40L48 46L54 48L48 50L46 56L42 52L36 54L38 48L32 50L36 44L30 46L34 40L28 42L32 36L26 38L30 32L24 34L28 28L22 30L26 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TemperatureIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2.5" />
    <path d="M32 12V20M32 44V52M12 32H20M44 32H52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M22 32C22 26.5 26.5 22 32 22C37.5 22 42 26.5 42 32C42 37.5 37.5 42 32 42C26.5 42 22 37.5 22 32Z" fill="currentColor" opacity="0.9" />
    <path d="M25 32C25 28.1 28.1 25 32 25C35.9 25 39 28.1 39 32C39 35.9 35.9 39 32 39C28.1 39 25 35.9 25 32Z" fill="#0c0c0f" />
  </svg>
);

const BrowColorIcon = ({ className = "w-7 h-7 text-white" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 30C16 20 24 16 32 20C40 16 48 20 54 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <path d="M10 30C16 20 24 16 32 20C40 16 48 20 54 30" stroke="#b8904d" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <path d="M46 40L52 52L48 54L42 42L46 40Z" fill="currentColor" />
    <path d="M52 52L56 48L58 54L56 58L52 52Z" fill="currentColor" opacity="0.6" />
  </svg>
);

const filterImages: Record<string, string> = {
  'Musa': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&h=150&q=80',
  'Bonito': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80',
  'Vitalidade': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
  'Natural': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
  'Doce': 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&h=150&q=80',
  'Frio': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  'Retrô': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80',
  'Película': 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=150&h=150&q=80',
  'Suave': 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=150&h=150&q=80',
  'Noite': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
};

const renderEffectIcon = (effectName: string, isSelected: boolean) => {
    const iconClass = `w-7 h-7 transition-all duration-300 ${isSelected ? 'text-[#a855f7] drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-gray-400'}`;
    switch (effectName) {
        case 'Branquear':
            return <WhitenIcon className={iconClass} />;
        case 'Alisar a pele':
            return <SmoothIcon className={iconClass} />;
        case 'Ruborizar':
            return <BlushIconPropsWrapper isSelected={isSelected} />;
        case 'Contraste':
            return <ContrastIcon className={iconClass} />;
        case 'Rosto Bebê':
            return <BabyFaceIcon className={iconClass} />;
        case 'Clarear dentes':
            return <TeethWhiteningIcon className={iconClass} />;
        case 'Preenchimento labial':
            return <LipFillIcon className={iconClass} />;
        case 'Aumentar lábios':
            return <LipAugmentIcon className={iconClass} />;
        case 'Ajuste de sorriso':
            return <SmileIcon className={iconClass} />;
        case 'Espessura da sobrancelha':
            return <BrowThicknessIcon className={iconClass} />;
        case 'Curvatura da sobrancelha':
            return <BrowCurveIcon className={iconClass} />;
        case 'Definição da sobrancelha':
            return <BrowDefinitionIcon className={iconClass} />;
        case 'Suavizar rugas':
            return <WrinkleIcon className={iconClass} />;
        case 'Clarear olheiras':
            return <DarkCircleIcon className={iconClass} />;
        case 'Ajuste de mandíbula e queixo':
            return <JawChinIcon className={iconClass} />;
        case 'Refinamento de olhos':
            return <EyeRefineIcon className={iconClass} />;
        case 'Refinar nariz':
            return <NoseIcon className={iconClass} />;
        case 'Remover manchas':
            return <AcneIcon className={iconClass} />;
        case 'Reduzir brilho':
            return <ShineIcon className={iconClass} />;
        case 'Cor da sobrancelha':
            return <BrowColorIcon className={iconClass} />;
        case 'Balanço de Branco':
            return <TemperatureIcon className={iconClass} />;
        default:
            return <div className="text-xl">✨</div>;
    }
};

const BlushIconPropsWrapper: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
    return <BlushIcon className={isSelected ? 'w-7 h-7 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'w-7 h-7 opacity-75'} />;
};

interface BeautyEffectsPanelProps {
    onClose: () => void;
    currentUser: User;
    addToast: (type: ToastType, message: string) => void;
    videoRef?: React.RefObject<HTMLVideoElement | null>;
}

interface BeautyEffect {
  name: string;
  icon?: string;
  img?: string;
}

interface BeautyEffectsData {
  filters: BeautyEffect[];
  effects: BeautyEffect[];
}

// Efeitos garantidos no painel (mesmo que a API ainda não retorne os novos)
const FALLBACK_BEAUTY_EFFECTS: BeautyEffect[] = [
  { name: 'Branquear' },
  { name: 'Alisar a pele' },
  { name: 'Ruborizar' },
  { name: 'Contraste' },
  { name: 'Rosto Bebê' },
  { name: 'Clarear dentes' },
  { name: 'Preenchimento labial' },
  { name: 'Aumentar lábios' },
  { name: 'Ajuste de sorriso' },
  { name: 'Espessura da sobrancelha' },
  { name: 'Curvatura da sobrancelha' },
  { name: 'Definição da sobrancelha' },
  { name: 'Suavizar rugas' },
  { name: 'Clarear olheiras' },
  { name: 'Remover manchas' },
  { name: 'Reduzir brilho' },
  { name: 'Ajuste de mandíbula e queixo' },
  { name: 'Refinamento de olhos' },
  { name: 'Refinar nariz' },
  { name: 'Cor da sobrancelha' },
  { name: 'Balanço de Branco' },
];

// Efeitos que dependem exclusivamente da malha facial (MediaPipe) — sem fallback CSS
const MESH_ONLY_EFFECTS: ReadonlySet<string> = new Set([
  'Rosto Bebê',
  'Ajuste de mandíbula e queixo',
  'Refinamento de olhos',
  'Refinar nariz',
  'Cor da sobrancelha',
]);

// Paleta de cores para "Cor da sobrancelha"
const BROW_COLORS: { name: string; hex: string }[] = [
  { name: 'Preto', hex: '#1c1917' },
  { name: 'Castanho escuro', hex: '#2f1b12' },
  { name: 'Castanho', hex: '#4a2c17' },
  { name: 'Louro', hex: '#b8904d' },
  { name: 'Ruivo', hex: '#9c4a26' },
  { name: 'Cinza', hex: '#6b7280' },
  { name: 'Platinado', hex: '#d1c4a9' },
];

const BeautyEffectsPanel: React.FC<BeautyEffectsPanelProps> = ({ onClose, currentUser, addToast, videoRef }) => {
    const [activeTab, setActiveTab] = useState<'Beleza' | 'Recomendar'>('Beleza');
    const [selectedFilter, setSelectedFilter] = useState('Musa');
    const [selectedEffect, setSelectedEffect] = useState('Branquear');
    const [settings, setSettings] = useState<BeautySettings>({});
    const [effectsData, setEffectsData] = useState<BeautyEffectsData>({ filters: [], effects: [] });
    const [isLoading, setIsLoading] = useState(true);
    const saveTimeout = useRef<number | null>(null);
    const currentFilters = useRef<string>('');
    // 🎨 Filtros CSS acumulados por efeito (empilha vários ajustes no preview)
    const effectCssRef = useRef<Record<string, string>>({});
    const baseFilterRef = useRef<string>('');
    const initializingRef = useRef(false);

    // Fallback automatic calculation to locate the local video preview if videoRef is not provided
    const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
        if (!videoRef?.current) {
            const videoEl = document.querySelector('video');
            if (videoEl) {
                fallbackVideoRef.current = videoEl;
                console.log('✅ [BEAUTY_PANEL] Fallback video element resolved via DOM query');
            }
        }
    }, [videoRef]);

    const activeVideoRef = videoRef || fallbackVideoRef;

    // Fetch static effects definitions
    useEffect(() => {
        api.getBeautyEffects().then((response: any) => {
            // Lidar com a nova estrutura da API: { data: { filters, effects } }
            const data = response?.data || response;
            const serverEffects: BeautyEffect[] = data?.effects || [];
            // Garantir que todos os efeitos suportados pelo frontend apareçam
            const mergedEffects = [...serverEffects];
            FALLBACK_BEAUTY_EFFECTS.forEach((fe) => {
                if (!mergedEffects.some((e) => e.name === fe.name)) {
                    mergedEffects.push(fe);
                }
            });
            setEffectsData({
                filters: data?.filters || [],
                effects: mergedEffects
            });
        }).catch(err => {
            console.error('❌ [BEAUTY_PANEL] Erro ao buscar efeitos:', err);
            // Fallback local se a API falhar
            setEffectsData({ filters: [], effects: FALLBACK_BEAUTY_EFFECTS });
        });
    }, []);

    // Fetch user's saved settings
    useEffect(() => {
        if (currentUser?.id) {
            setIsLoading(true);
            api.getBeautySettings(currentUser.id)
                .then(data => {
                    const loaded = data || {};
                    // 🎨 Sem nenhum efeito salvo → o painel assume o FILTRO 2D PADRÃO
                    // da abertura da live (claro, brilhante, sem amarelo) em vez de
                    // zerar tudo e voltar a imagem crua/amarelada.
                    // Só seeda o filtro padrão se o usuário NUNCA configurou nada
                    // (nenhuma chave de efeito salva). Quem salvou valores (mesmo 0)
                    // mantém a escolha dele.
                    const hasAnyEffectKey = Object.keys(loaded).some(k =>
                        k !== 'activeTab' && k !== 'selectedFilter' && k !== 'selectedEffect'
                    );
                    // 🎨 Sempre preencher as chaves ausentes com o filtro 2D padrão
                    // (2D layer na abertura da live). Se o usuário tem configurações
                    // salvas ANTIGAS (sem os novos efeitos), os novos efeitos entram
                    // com os valores padrão em vez de zerados — sem conflitar com o
                    // que ele já ajustou (valores salvos sempre vencem).
                    const defaultKeys: Record<string, number> = {
                        'Branquear': DEFAULT_BEAUTY_SETTINGS.whitening,
                        'Alisar a pele': DEFAULT_BEAUTY_SETTINGS.smoothing,
                        'Ruborizar': DEFAULT_BEAUTY_SETTINGS.saturation,
                        'Contraste': DEFAULT_BEAUTY_SETTINGS.contrast,
                        'Balanço de Branco': DEFAULT_BEAUTY_SETTINGS.whiteBalance,
                        'Remover manchas': DEFAULT_BEAUTY_SETTINGS.acneRemoval,
                        'Suavizar rugas': DEFAULT_BEAUTY_SETTINGS.wrinkleSmoothing,
                        'Clarear olheiras': DEFAULT_BEAUTY_SETTINGS.darkCircle,
                        'Reduzir brilho': DEFAULT_BEAUTY_SETTINGS.shineReduction,
                        'Rosto Bebê': DEFAULT_BEAUTY_SETTINGS.babyFace,
                    };
                    const effective = {
                        ...defaultKeys,
                        ...loaded,
                    };
                    setSettings(effective);
                    
                    // Carregar estado completo do painel
                    if (effective?.activeTab) {
                        setActiveTab(effective.activeTab);
                    }
                    if (effective?.selectedFilter) {
                        setSelectedFilter(effective.selectedFilter);
                    }
                    if (effective?.selectedEffect) {
                        setSelectedEffect(effective.selectedEffect);
                    }
                    
                    // Aplicar configurações ao processador de vídeo
                    const beautySettings = convertSettingsToBeautySettings(effective);
                    videoProcessor.updateBeautySettings(beautySettings);
                    
                    // Iniciar processamento se ainda não estiver ativo
                    if (activeVideoRef?.current && !beautyWebRTCIntegration.isBeautyActive()) {
                        initializeBeautyProcessing();
                    }

                    // Aplicar os filtros CSS iniciais para visualização em tempo real do host
                    if (effective?.selectedFilter && effective.selectedFilter !== 'Fechar') {
                        applyFilterToVideo(effective.selectedFilter);
                    } else {
                        // Se não tem filtro selecionado, aplicar efeitos individuais (empilhados)
                        Object.entries(effective).forEach(([effectName, val]) => {
                            if (typeof val === 'number') {
                                applyEffectToVideo(effectName, val);
                            }
                        });
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch beauty settings:", err);
                    addToast(ToastType.Error, "Não foi possível carregar os efeitos de beleza.");
                })
                .finally(() => setIsLoading(false));
        }
    }, [currentUser, addToast, activeVideoRef]);

    // Inicializar processamento de beleza quando o painel abrir
    useEffect(() => {
        if (activeVideoRef?.current && currentUser?.id) {
            initializeBeautyProcessing();
        }
    }, [activeVideoRef, currentUser]);

    // 👶 "Rosto Bebê" é um efeito COMPLETO: além do warp da malha facial
    // (queixo/nariz/olhos arredondados), ele automaticamente suaviza rugas,
    // remove manchas e clareia olheiras — proporcional à intensidade do slider.
    // O que o usuário ajustou manualmente nos sliders individuais sempre vence
    // (Math.max), então nada é perdido.
    const applyBabyFaceCombo = (s: Partial<BeautyEffectSettings>): Partial<BeautyEffectSettings> => {
        const bf = s.babyFace || 0;
        if (bf <= 0) return s;
        return {
            ...s,
            // Multiplicadores com CAP para não plastificar: a pele lisa de bebê
            // vem do warp da malha + suavização moderada; exagerar deixa o rosto
            // borrado/fake. O que o usuário ajustou manualmente sempre vence.
            wrinkleSmoothing: Math.max(s.wrinkleSmoothing || 0, Math.min(75, Math.round(bf * 0.65))),
            acneRemoval: Math.max(s.acneRemoval || 0, Math.min(70, Math.round(bf * 0.55))),
            darkCircle: Math.max(s.darkCircle || 0, Math.min(50, Math.round(bf * 0.4))),
            smoothing: Math.max(s.smoothing || 0, Math.min(45, Math.round(bf * 0.35))),
        };
    };

    // Converter configurações do formato da API para o formato do VideoProcessor
    const convertSettingsToBeautySettings = (apiSettings: BeautySettings): Partial<BeautyEffectSettings> => {
        const rawBrowColor = apiSettings['Cor da sobrancelha'];
        const browColor = typeof rawBrowColor === 'string' ? rawBrowColor : '';
        return applyBabyFaceCombo({
            whitening: apiSettings['Branquear'] || 0,
            smoothing: apiSettings['Alisar a pele'] || 0,
            saturation: apiSettings['Ruborizar'] || 0,
            contrast: apiSettings['Contraste'] || 0,
            babyFace: apiSettings['Rosto Bebê'] || 0,
            teethWhitening: apiSettings['Clarear dentes'] || 0,
            lipFill: apiSettings['Preenchimento labial'] || 0,
            lipAugment: apiSettings['Aumentar lábios'] || 0,
            smileAdjust: apiSettings['Ajuste de sorriso'] || 0,
            browThickness: apiSettings['Espessura da sobrancelha'] || 0,
            browCurve: apiSettings['Curvatura da sobrancelha'] || 0,
            browDefinition: apiSettings['Definição da sobrancelha'] || 0,
            browColor,
            browColorStrength: apiSettings['browColorIntensity'] || 0,
            wrinkleSmoothing: apiSettings['Suavizar rugas'] || 0,
            darkCircle: apiSettings['Clarear olheiras'] || 0,
            acneRemoval: apiSettings['Remover manchas'] || 0,
            shineReduction: apiSettings['Reduzir brilho'] || 0,
            noseRefine: apiSettings['Refinar nariz'] || 0,
            jawChin: apiSettings['Ajuste de mandíbula e queixo'] || 0,
            eyeRefine: apiSettings['Refinamento de olhos'] || 0,
            whiteBalance: Number(apiSettings['Balanço de Branco']) || 0
        });
    };

    // Inicializar processamento de beleza e conectar ao pipeline de publicação
    const initializeBeautyProcessing = async () => {
        if (initializingRef.current) return;
        initializingRef.current = true;
        try {
            const video = activeVideoRef?.current;
            if (!video) return;

            // Inicializar processador de vídeo com o elemento de vídeo da câmera
            const success = await videoProcessor.initialize(video);
            if (!success) {
                console.warn('[BEAUTY_PANEL] VideoProcessor não conseguiu inicializar, usando CSS filters como fallback');
                return;
            }

            // Iniciar processamento — retorna stream com efeitos aplicados via WebGL
            const processedStream = videoProcessor.startProcessing();
            if (!processedStream) {
                console.warn('[BEAUTY_PANEL] processedStream é nulo');
                return;
            }

            // 🔥 CONECTAR AO PIPELINE DE PUBLICAÇÃO: o streamPublishService usará este stream
            // para substituir a track de vídeo original pela processada
            const { streamPublishService } = await import('../../services/streamPublishService');
            streamPublishService.setBeautyProcessedStream(processedStream);

            // Se já estiver publicando, substituir a track dinamicamente
            if (streamPublishService.isPublishing()) {
                await streamPublishService.updateBeautyTrack();
            }

            // Configurar integração com WebRTC
            await beautyWebRTCIntegration.initialize(processedStream);
            beautyWebRTCIntegration.toggleBeauty(); // Ativar beleza

            console.log('✅ [BEAUTY_PANEL] Processamento WebGL ativo e conectado à publicação');
            
        } catch (error) {
            console.error('❌ [BEAUTY_PANEL] Erro ao inicializar processamento:', error);
            addToast(ToastType.Error, "Falha ao inicializar efeitos de beleza.");
        } finally {
            initializingRef.current = false;
        }
    };

    // Rebuild do filtro CSS do preview local empilhando: filtro pré-definido
    // (se houver) + TODOS os efeitos individuais ativos (ex.: Branquear + Alisar).
    const rebuildVideoCss = () => {
        const video = activeVideoRef?.current;
        if (!video) return;
        // 📺 Se o preview já mostra o stream processado (WebGL), os efeitos são
        // aplicados na imagem via canvas — aplicar CSS por cima DOBRARIA tudo.
        const processed = videoProcessor.getProcessedStream();
        if (processed && video.srcObject === processed) {
            video.style.filter = 'none';
            currentFilters.current = '';
            return;
        }
        const parts: string[] = [];
        if (baseFilterRef.current && baseFilterRef.current !== 'none') {
            parts.push(baseFilterRef.current);
        }
        Object.values(effectCssRef.current).forEach((f) => parts.push(f));
        video.style.filter = parts.length ? parts.join(' ') : 'none';
        currentFilters.current = video.style.filter;
    };

    // Função para aplicar efeitos CSS diretamente no vídeo com filtragem suave profissional
    const applyEffectToVideo = (effectName: string, intensity: number) => {
        const video = activeVideoRef?.current;
        if (!video) return;

        // Mapeamento profissional e calibrado dos efeitos para filtros CSS de alta performance
        const effectMap: Record<string, (int: number) => string> = {
            'Branquear': (int) => `brightness(${1 + (int / 180)})`,
            'Alisar a pele': (int) => `contrast(${1 - (int / 1200)}) brightness(${1 + (int / 1500)}) blur(${Math.min(int / 140, 0.75)}px)`,
            'Ruborizar': (int) => `saturate(${1 + (int / 120)})`,
            'Contraste': (int) => `contrast(${1 + (int / 250)})`,
            'Balanço de Branco': (int) => `sepia(${Math.min(int / 400, 0.12)}) hue-rotate(${(int / 3.2) * -1}deg)`,
            'Clarear dentes': (int) => `brightness(${1 + (int / 300)}) saturate(${1 - (int / 1500)})`,
            'Preenchimento labial': (int) => `saturate(${1 + (int / 350)})`,
            'Aumentar lábios': (int) => `saturate(${1 + (int / 300)}) contrast(${1 + (int / 900)})`,
            'Ajuste de sorriso': (int) => `brightness(${1 + (int / 500)})`,
            'Espessura da sobrancelha': (int) => `contrast(${1 + (int / 450)})`,
            'Curvatura da sobrancelha': (int) => `contrast(${1 + (int / 450)})`,
            'Definição da sobrancelha': (int) => `contrast(${1 + (int / 250)}) saturate(${1 - (int / 1500)})`,
            'Suavizar rugas': (int) => `blur(${Math.min(int / 320, 0.5)}px)`,
            'Clarear olheiras': (int) => `brightness(${1 + (int / 400)})`,
            'Remover manchas': (int) => `blur(${Math.min(int / 220, 0.9)}px) contrast(${1 + (int / 2000)})`,
            'Reduzir brilho': (int) => `brightness(${1 - (int / 700)}) saturate(${1 - (int / 1000)})`,
            'Ajuste de mandíbula e queixo': (int) => `contrast(${1 + (int / 450)})`,
            'Refinamento de olhos': (int) => `contrast(${1 + (int / 300)})`,
            'Refinar nariz': (int) => `contrast(${1 + (int / 450)})`
        };

        const fn = effectMap[effectName];
        if (!fn) return;
        if (intensity <= 0) {
            delete effectCssRef.current[effectName];
        } else {
            effectCssRef.current[effectName] = fn(intensity);
        }
        rebuildVideoCss();
    };

    // Função para aplicar filtro pré-definido com visual refinado
    const applyFilterToVideo = (filterName: string) => {
        const video = activeVideoRef?.current;
        if (!video) return;

        const filterMap: Record<string, string> = {
            'Fechar': 'none',
            'Musa': 'brightness(1.1) saturate(1.15) contrast(1.05)',
            'Bonito': 'brightness(1.12) saturate(1.1) contrast(1.08)',
            'Vitalidade': 'brightness(1.15) saturate(1.22) contrast(1.1)',
            'Natural': 'brightness(1.05) saturate(1.05) contrast(1.02)',
            'Doce': 'brightness(1.08) saturate(1.18) contrast(1.0) hue-rotate(10deg)',
            'Frio': 'brightness(1.05) saturate(0.88) contrast(1.12) sepia(0.04) hue-rotate(15deg)',
            'Retrô': 'brightness(1.0) saturate(0.75) contrast(1.15) sepia(0.25)',
            'Película': 'brightness(1.08) saturate(1.05) contrast(1.25) sepia(0.12)',
            'Suave': 'brightness(1.12) saturate(0.85) contrast(0.92) blur(0.3px)',
            'Noite': 'brightness(1.2) saturate(1.1) contrast(1.15)'
        };

        const filterString = filterMap[filterName] || 'none';
        baseFilterRef.current = filterString;
        // Filtro pré-definido sobrescreve os efeitos individuais (visual calibrado),
        // mas preserva o Balanço de Branco para o preview local continuar consistente.
        const wbCss = effectCssRef.current['Balanço de Branco'];
        effectCssRef.current = {};
        if (wbCss) effectCssRef.current['Balanço de Branco'] = wbCss;
        rebuildVideoCss();
    };

    // Debounced save function
    const saveSettings = (newSettings: BeautySettings) => {
        if (saveTimeout.current) {
            clearTimeout(saveTimeout.current);
        }
        saveTimeout.current = window.setTimeout(() => {
            if (currentUser?.id) {
                // Incluir estado completo do painel
                const completeSettings: BeautySettings = {
                    ...newSettings,
                    activeTab,
                    selectedFilter,
                    selectedEffect
                };
                
                api.updateBeautySettings(currentUser.id, completeSettings)
                    .then(() => {
                        // Success - no sensitive data logged
                    })
                    .catch(err => {
                        console.error('❌ [BEAUTY_PANEL] Erro ao salvar configurações:', err);
                        addToast(ToastType.Error, "Falha ao salvar o efeito.");
                    });
            }
        }, 500);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeout.current) {
                clearTimeout(saveTimeout.current);
            }
        };
    }, []);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        // A cor da sobrancelha guarda o hex em 'Cor da sobrancelha'; o slider
        // controla a INTENSIDADE (browColorIntensity)
        const isBrowColor = selectedEffect === 'Cor da sobrancelha';
        const key = isBrowColor ? 'browColorIntensity' : selectedEffect;
        const newSettings = {
            ...settings,
            [key]: value
        };
        setSettings(newSettings);
        saveSettings(newSettings);
        
        // Aplicar efeito em tempo real no processador de vídeo WebGL (transmissão)
        const beautySettings = convertSettingsToBeautySettings(newSettings);
        videoProcessor.updateBeautySettings(beautySettings);
        
        // Efeitos de malha (MediaPipe) não têm equivalente em CSS — o warp acontece
        // no processador WebGL; o CSS só é fallback para os efeitos de cor/suavização
        if (!MESH_ONLY_EFFECTS.has(selectedEffect)) {
            // Sempre aplicar efeitos CSS ao vídeo local para feedback imediato e impecável na tela do broadcaster
            applyEffectToVideo(selectedEffect, value);
        }
    };

    // Handler para selecionar a cor da sobrancelha
    const handleBrowColorSelect = (hex: string | null) => {
        const newSettings: BeautySettings = {
            ...settings,
            'Cor da sobrancelha': hex || '',
            // Preserva a intensidade atual; se desligar a cor, zera a intensidade
            browColorIntensity: hex ? (settings['browColorIntensity'] || 50) : 0
        };
        setSettings(newSettings);
        saveSettings(newSettings);
        videoProcessor.updateBeautySettings(convertSettingsToBeautySettings(newSettings));
    };

    // Handler para seleção de filtros (Recomendar)
    const handleFilterSelect = (filterName: string) => {
        setSelectedFilter(filterName);
        
        // Configurações para filtros pré-definidos
        const filterSettings: Record<string, Partial<BeautyEffectSettings>> = {
            'Fechar': { whitening: 0, smoothing: 0, saturation: 0, contrast: 0 },
            'Musa': { whitening: 10, smoothing: 15, saturation: 20, contrast: 5 },
            'Bonito': { whitening: 15, smoothing: 20, saturation: 10, contrast: 10 },
            'Vitalidade': { whitening: 20, smoothing: 10, saturation: 30, contrast: 15 },
            'Natural': { whitening: 5, smoothing: 8, saturation: 5, contrast: 3 },
            'Doce': { whitening: 12, smoothing: 25, saturation: 25, contrast: 2 },
            'Frio': { whitening: 0, smoothing: 10, saturation: -10, contrast: 12 },
            'Retrô': { whitening: 0, smoothing: 5, saturation: -15, contrast: 20 },
            'Película': { whitening: 8, smoothing: 12, saturation: 8, contrast: 25 },
            'Suave': { whitening: 15, smoothing: 30, saturation: -5, contrast: -5 },
            'Noite': { whitening: 25, smoothing: 5, saturation: 15, contrast: 20 }
        };
        
        const selectedSettings = filterSettings[filterName] || filterSettings['Fechar'];
        
        // Converter para o formato da API
        const apiSettings: BeautySettings = {};
        if (selectedSettings.whitening > 0) apiSettings['Branquear'] = selectedSettings.whitening;
        if (selectedSettings.smoothing > 0) apiSettings['Alisar a pele'] = selectedSettings.smoothing;
        if (selectedSettings.saturation > 0) apiSettings['Ruborizar'] = selectedSettings.saturation;
        if (selectedSettings.contrast > 0) apiSettings['Contraste'] = selectedSettings.contrast;
        
        // Salvar o filtro selecionado
        apiSettings['selectedFilter'] = filterName;

        // Preservar o balanço de branco (5400K) escolhido pelo usuário
        if (Number(settings['Balanço de Branco'] || 0) > 0) {
            apiSettings['Balanço de Branco'] = settings['Balanço de Branco'];
        }
        
        // Salvar na API
        saveSettings(apiSettings);
        
        // Sincronizar tanto WebGL quanto render local (preservando "Rosto Bebê"
        // e aplicando o combo completo: rugas + manchas + olheiras)
        videoProcessor.updateBeautySettings(applyBabyFaceCombo({ ...selectedSettings, babyFace: settings['Rosto Bebê'] || 0 }));
        applyFilterToVideo(filterName);
    };

    // Handler para seleção de efeitos (Beleza)
    const handleEffectSelect = (effectName: string) => {
        setSelectedEffect(effectName);
        
        // Salvar estado completo
        const completeSettings: BeautySettings = {
            ...settings,
            activeTab,
            selectedFilter,
            selectedEffect: effectName
        };
        saveSettings(completeSettings);
    };

    const resetEffects = () => {
        const defaultSettings: BeautySettings = effectsData.effects.reduce((acc, effect) => {
            // Cor da sobrancelha guarda hex (string) — o reset desliga a cor
            if (effect.name === 'Cor da sobrancelha') {
                acc['Cor da sobrancelha'] = '';
                acc['browColorIntensity'] = 0;
            } else {
                acc[effect.name] = effect.name === 'Rosto Bebê' ? 0 : 20; // Defaulting to 20
            }
            return acc;
        }, {} as BeautySettings);
        
        setSettings(defaultSettings);
        saveSettings(defaultSettings);
        setSelectedFilter('Musa');
        setSelectedEffect('Branquear');
        
        // Resetar processador de vídeo WebGL
        videoProcessor.updateBeautySettings({
            whitening: 0,
            smoothing: 0,
            saturation: 0,
            contrast: 0,
            babyFace: 0,
            teethWhitening: 0,
            lipFill: 0,
            lipAugment: 0,
            smileAdjust: 0,
            browThickness: 0,
            browCurve: 0,
            browDefinition: 0,
            wrinkleSmoothing: 0,
            darkCircle: 0,
            acneRemoval: 0,
            shineReduction: 0,
            noseRefine: 0,
            jawChin: 0,
            eyeRefine: 0,
            browColor: '',
            browColorStrength: 0,
            whiteBalance: 0
        });
        
        // Resetar vídeo (filtro CSS local)
        const video = activeVideoRef?.current;
        if (video) {
            video.style.filter = 'none';
            currentFilters.current = '';
            effectCssRef.current = {};
            baseFilterRef.current = '';
        }
    };
    
    const currentEffectValue = selectedEffect === 'Cor da sobrancelha'
        ? (settings['browColorIntensity'] ?? 0)
        : (settings[selectedEffect] ?? 0);
    const currentBrowColor = typeof settings['Cor da sobrancelha'] === 'string'
        ? settings['Cor da sobrancelha']
        : '';

    return (
         <div className="absolute inset-x-0 bottom-0 bg-[#0c0c0f] border-t border-white/5 rounded-t-[28px] z-50 p-4 pb-7 shadow-2xl animate-fade-in max-h-[36vh] overflow-y-auto no-scrollbar overscroll-contain" onClick={e => e.stopPropagation()}>
            {/* Header Tabs Row */}
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center space-x-6">
                    <button 
                        onClick={() => {
                            setActiveTab('Recomendar');
                            const completeSettings: BeautySettings = {
                                ...settings,
                                activeTab: 'Recomendar',
                                selectedFilter,
                                selectedEffect
                            };
                            saveSettings(completeSettings);
                        }} 
                        className={`transition-colors font-sans text-[15px] ${activeTab === 'Recomendar' ? 'text-white font-extrabold tracking-wide' : 'text-[#717175] font-semibold hover:text-white'}`}
                    >
                        Recomendar
                    </button>
                    <button 
                        onClick={() => {
                            setActiveTab('Beleza');
                            const completeSettings: BeautySettings = {
                                ...settings,
                                activeTab: 'Beleza',
                                selectedFilter,
                                selectedEffect
                            };
                            saveSettings(completeSettings);
                        }} 
                        className={`transition-colors font-sans text-[15px] ${activeTab === 'Beleza' ? 'text-white font-extrabold tracking-wide' : 'text-[#717175] font-semibold hover:text-white'}`}
                    >
                        Beleza
                    </button>
                    <button 
                        onClick={resetEffects} 
                        className="transition-colors font-sans text-[15px] text-[#717175] font-semibold hover:text-white"
                    >
                        Redefinir
                    </button>
                </div>
                <div>
                    <button 
                        onClick={onClose} 
                        className="w-7 h-7 bg-[#28282c] rounded-full flex items-center justify-center text-white hover:bg-[#34343a] transition-all"
                    >
                        <CloseIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filter Presets Row — scrollable horizontal carousel */}
            {activeTab === 'Recomendar' && (
                <div className="overflow-x-auto no-scrollbar mb-5 pt-1 pb-2 -mx-1 px-1">
                    <div className="flex gap-3 min-w-max px-0.5">
                        {effectsData.filters.map(f => {
                            const isSelected = selectedFilter === f.name;
                            const isFechar = f.name === 'Fechar';
                            return (
                                <button 
                                    key={f.name} 
                                    onClick={() => handleFilterSelect(f.name)} 
                                    className="flex flex-col items-center space-y-2 focus:outline-none group shrink-0"
                                >
                                    {isFechar ? (
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-[#242428] border border-white/5 transition-all duration-300 ${isSelected ? 'ring-[2.5px] ring-[#a855f7] ring-offset-2 ring-offset-[#0c0c0f] scale-105 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'hover:border-white/10'}`}>
                                            <LockIconCustom className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                                        </div>
                                    ) : (
                                        <img 
                                            src={filterImages[f.name] || f.img || `https://picsum.photos/seed/${f.name}/150/150`} 
                                            alt={f.name} 
                                            className={`w-12 h-12 rounded-full object-cover transition-all duration-300 ${isSelected ? 'ring-[2.5px] ring-[#a855f7] ring-offset-2 ring-offset-[#0c0c0f] scale-105 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'opacity-80 group-hover:opacity-100'}`} 
                                        />
                                    )}
                                    <span className={`text-[10px] transition-colors whitespace-nowrap ${isSelected ? 'text-white font-extrabold' : 'text-[#a1a1aa] group-hover:text-white'}`} translate="no">
                                        {f.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Slider Section (Always present at bottom adjustments) */}
            <div className="flex items-center space-x-4 mb-4 px-1.5 mt-2">
                <span className="text-[#a855f7] font-sans font-black text-base w-7 text-center shrink-0">
                    {currentEffectValue}
                </span>
                <div className="relative flex-1 flex items-center h-5">
                    {/* Background track */}
                    <div className="absolute left-0 right-0 h-[3px] bg-[#242428] rounded-full" />
                    {/* Progress track */}
                    <div 
                        className="absolute left-0 h-[3px] bg-[#a855f7] rounded-full" 
                        style={{ width: `${currentEffectValue}%` }}
                    />
                    {/* Invisible Input slider overlay with custom styled thumb */}
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={currentEffectValue} 
                        onChange={handleSliderChange} 
                        disabled={isLoading} 
                        className="w-full h-full appearance-none bg-transparent cursor-pointer relative z-10 focus:outline-none 
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[4px] 
                                   [&::-webkit-slider-thumb]:border-[#a855f7] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(168,85,247,0.8)]
                                   [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                                   [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-[4px] [&::-moz-range-thumb]:border-[#a855f7] 
                                   [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(168,85,247,0.8)]" 
                    />
                </div>
            </div>

            {/* Paleta de cores da sobrancelha (aparece só quando a ferramenta ativa) */}
            {selectedEffect === 'Cor da sobrancelha' && (
                <div className="overflow-x-auto no-scrollbar mb-3 -mx-1 px-1">
                    <div className="flex gap-3 items-center min-w-max px-0.5">
                        {/* Botão "sem cor" */}
                        <button
                            onClick={() => handleBrowColorSelect(null)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 bg-[#242428] border border-white/10 ${!currentBrowColor ? 'ring-[2.5px] ring-[#a855f7] ring-offset-2 ring-offset-[#0c0c0f] scale-105' : 'hover:border-white/30'}`}
                            title="Sem cor"
                        >
                            <CloseIcon className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        {BROW_COLORS.map((c) => {
                            const isSelected = currentBrowColor.toLowerCase() === c.hex.toLowerCase();
                            return (
                                <button
                                    key={c.hex}
                                    onClick={() => handleBrowColorSelect(c.hex)}
                                    className={`w-9 h-9 rounded-full shrink-0 transition-all duration-300 ${isSelected ? 'ring-[2.5px] ring-[#a855f7] ring-offset-2 ring-offset-[#0c0c0f] scale-110 shadow-[0_0_12px_rgba(168,85,247,0.5)]' : 'hover:scale-105 hover:opacity-90'}`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Custom Beauty Adjustments ("Beleza" effects list) - Always at the bottom per screenshot */}
            <div className="overflow-x-auto no-scrollbar text-center mt-4 -mx-1 px-1">
                <div className="flex gap-3 min-w-max">
                {effectsData.effects.map((e) => {
                    const isSelected = selectedEffect === e.name;
                    return (
                         <button 
                            key={e.name} 
                            onClick={() => handleEffectSelect(e.name)} 
                            className="flex flex-col items-center space-y-2.5 focus:outline-none group shrink-0"
                         >
                            <div className={`w-[72px] h-[72px] rounded-[18px] flex items-center justify-center transition-all duration-300 relative ${isSelected ? 'bg-[#201d2a]/60 border-[2.5px] border-[#a552f4] shadow-[0_0_15px_rgba(168,85,247,0.25)] scale-105' : 'bg-[#1b1b1f] border border-white/5 hover:border-white/10 group-hover:scale-102'}`}>
                                {renderEffectIcon(e.name, isSelected)}
                            </div>
                            <span className={`text-[11px] font-sans font-medium transition-colors ${isSelected ? 'text-white font-bold' : 'text-[#a1a1aa] group-hover:text-white'}`} translate="no">
                                {e.name}
                            </span>
                        </button>
                    );
                })}
                </div>
            </div>
        </div>
    );
};

export default BeautyEffectsPanel;

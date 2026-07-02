import React from 'react';

interface Category {
  key: string;
  label: string;
}

interface CategorySelectorProps {
  selectedCategoryLabel: string;
  selectedRegion: string;
  onCategoryClick: () => void;
  onRegionChange?: (region: string) => void;
  onRegionSelectClick?: () => void;
  isInviteMode?: boolean;
}

const CATEGORIES = [
  { key: 'popular', label: 'Popular' },
  { key: 'followed', label: 'Seguindo' },
  { key: 'nearby', label: 'Perto' },
  { key: 'pk', label: 'PK' },
  { key: 'new', label: 'Novo' },
  { key: 'music', label: 'Música' },
  { key: 'dance', label: 'Dança' },
  { key: 'party', label: 'Festa' },
  { key: 'private', label: 'Privada' }
];

const getRegionInfo = (code: string) => {
    const defaultRegion = { name: "Global", code: "global", flag: null };
    const mappings: Record<string, any> = {
        'br': { name: 'Brasil', code: 'br', flag: 'https://flagcdn.com/br.svg' },
        'us': { name: 'Estados Unidos', code: 'us', flag: 'https://flagcdn.com/us.svg' },
        'pt': { name: 'Portugal', code: 'pt', flag: 'https://flagcdn.com/pt.svg' },
        'es': { name: 'Espanha', code: 'es', flag: 'https://flagcdn.com/es.svg' },
        'ar': { name: 'Argentina', code: 'ar', flag: 'https://flagcdn.com/ar.svg' },
        'co': { name: 'Colômbia', code: 'co', flag: 'https://flagcdn.com/co.svg' },
        'mx': { name: 'México', code: 'mx', flag: 'https://flagcdn.com/mx.svg' },
        'it': { name: 'Itália', code: 'it', flag: 'https://flagcdn.com/it.svg' },
        'fr': { name: 'França', code: 'fr', flag: 'https://flagcdn.com/fr.svg' },
        'de': { name: 'Alemanha', code: 'de', flag: 'https://flagcdn.com/de.svg' },
        'gb': { name: 'Reino Unido', code: 'gb', flag: 'https://flagcdn.com/gb.svg' },
        'ca': { name: 'Canadá', code: 'ca', flag: 'https://flagcdn.com/ca.svg' },
    };
    
    return mappings[code?.toLowerCase()] || defaultRegion;
};

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryLabel,
  selectedRegion,
  onCategoryClick,
  onRegionChange,
  onRegionSelectClick,
  isInviteMode = false
}) => {
  if (isInviteMode) return null;

  const currentRegion = getRegionInfo(selectedRegion);

  return (
    <div className="flex items-center space-x-2">
      <button onClick={onCategoryClick} className="bg-[#2a2a2e]/80 text-[#e2e2e2] text-[13px] px-4 py-[6px] rounded-full hover:bg-gray-600/80 transition-colors shadow-sm">
        {selectedCategoryLabel}
      </button>
      
      <button 
        onClick={onRegionSelectClick}
        className="bg-[#2a2a2e]/80 text-[#e2e2e2] text-[13px] px-3.5 py-[6px] rounded-full flex items-center space-x-1.5 hover:bg-gray-600/80 transition-colors shadow-sm"
      >
        {currentRegion.flag ? (
            <img src={currentRegion.flag} alt={currentRegion.name} className="w-4 h-4 rounded-[3px] object-cover" />
        ) : (
            <span className="opacity-90 leading-none mr-0.5">🌍</span>
        )}
        <span className="font-medium mr-1">{currentRegion.name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>
  );
};

export { CATEGORIES };

import React from 'react';

interface Category {
  key: string;
  label: string;
}

interface CategorySelectorProps {
  selectedCategoryLabel: string;
  selectedRegion: string;
  onCategoryClick: () => void;
  onRegionChange: (region: string) => void;
  isInviteMode?: boolean;
}

const CATEGORIES = [
  { key: 'popular', label: 'Popular' },
  { key: 'followed', label: 'Seguido' },
  { key: 'nearby', label: 'Perto' },
  { key: 'pk', label: 'PK' },
  { key: 'new', label: 'Novo' },
  { key: 'music', label: 'Música' },
  { key: 'dance', label: 'Dança' },
  { key: 'party', label: 'Festa' },
  { key: 'private', label: 'Privado' }
];

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryLabel,
  selectedRegion,
  onCategoryClick,
  onRegionChange,
  isInviteMode = false
}) => {
  if (isInviteMode) return null;

  return (
    <div className="flex items-center space-x-2">
      <button onClick={onCategoryClick} className="bg-gray-700/80 text-gray-300 text-sm px-3 py-1 rounded-full">
        {selectedCategoryLabel}
      </button>
      
      <select
        value={selectedRegion}
        onChange={e => onRegionChange(e.target.value)}
        className="bg-gray-700/80 text-gray-300 text-sm px-3 py-1 rounded-full border-none focus:outline-none"
      >
        <option value="br">🇧🇷 Brasil</option>
        <option value="us">🇺🇸 USA</option>
        <option value="global">🌍 Global</option>
      </select>
    </div>
  );
};

export { CATEGORIES };

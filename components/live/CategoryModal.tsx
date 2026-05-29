import React from 'react';
import { CloseIcon } from '../icons';

interface Category {
  key: string;
  label: string;
}

interface CategoryModalProps {
  onClose: () => void;
  onSelectCategory: (categoryKey: string) => void;
  selectedCategoryKey: string;
  categories: Category[];
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ 
  onClose, 
  onSelectCategory, 
  selectedCategoryKey, 
  categories 
}) => {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-[#222225] rounded-t-2xl z-50 p-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Selecionar Categoria</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
      
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li
            key={cat.key}
            onClick={() => onSelectCategory(cat.key)}
            className={`p-3 rounded-lg text-left w-full cursor-pointer transition-colors ${
              selectedCategoryKey === cat.key 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            {cat.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

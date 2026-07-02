import React from 'react';
import { Country } from '../types';
import { CloseIcon, GlobeIcon } from './icons';
import { useTranslation } from '../i18n';

interface RegionModalProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Country[];
  selectedCountryCode: string;
  onSelectRegion: (countryCode: string) => void;
}

const parseCountry = (country: Country) => {
  if (country.code === 'ICON_GLOBE') {
    return { code: 'GL', name: 'Global' };
  }
  
  const code = country.code.toUpperCase();
  const nameClean = country.name.trim();
  
  // Clean cases like "BR Brasil", "br Brasil", "BR-Brasil", "us Estados Unidos"
  const regex = new RegExp(`^(${code}|${code.toLowerCase()})\\s*[-–]?\\s*`, 'i');
  let displayName = nameClean.replace(regex, '').trim();
  
  if (displayName === nameClean) {
    // If exact code match failed, try to clean any starting 2-letter uppercase/lowercase code
    const generalRegex = /^[A-Z]{2}\s+[-–]?\s*/i;
    displayName = nameClean.replace(generalRegex, '').trim();
  }
  
  if (displayName) {
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  } else {
    displayName = nameClean;
  }
  
  return {
    code,
    name: displayName
  };
};

const RegionModal: React.FC<RegionModalProps> = ({ isOpen, onClose, countries, selectedCountryCode, onSelectRegion }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const displayCountries = [...countries];
  if (!displayCountries.find(c => c.code === 'ICON_GLOBE')) {
      displayCountries.unshift({ code: 'ICON_GLOBE', name: 'Global' });
  }

  return (
    <div 
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/[0.03] transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1C1E] border-t border-white/[0.05] w-full max-w-md mx-auto rounded-t-2xl p-4 flex flex-col max-h-[75vh] shadow-[0_-8px_32px_rgba(0,0,0,0.5)]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-[17px] font-bold text-gray-200">
            {t('region.select') || "Selecione uma região"}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white cursor-pointer p-1 rounded-full active:bg-white/10"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-grow overflow-y-auto pb-4 scrollbar-none">
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 text-center py-2">
            {displayCountries.map((country) => {
              const isSelected = selectedCountryCode === country.code;
              const parsed = parseCountry(country);
              return (
                <button
                  key={country.code}
                  onClick={() => onSelectRegion(country.code)}
                  className="flex flex-col items-center focus:outline-none cursor-pointer group"
                >
                  {/* Flag Container */}
                  <div className={`relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                      isSelected
                        ? 'border-2 border-[#00B4FF] shadow-[0_0_12px_rgba(0,180,255,0.6)] bg-[#2C2C2E]'
                        : 'bg-[#2C2C2E] hover:bg-[#3A3A3C]'
                    }`}
                  >
                    {country.code === 'ICON_GLOBE' ? (
                      <GlobeIcon className="w-6 h-6 text-gray-300" />
                    ) : (
                      <img 
                        src={`https://flagcdn.com/${country.code.toLowerCase()}.svg`} 
                        alt={parsed.name} 
                        className="w-[32px] h-[22px] rounded-[3px] object-cover shadow-sm"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  {/* Text details under the flag */}
                  <div className="flex flex-col items-center mt-1 w-full px-1">
                    {country.code === 'ICON_GLOBE' ? (
                      <div className={`text-[10px] truncate max-w-full tracking-wide ${
                        isSelected ? 'text-white font-semibold' : 'text-[#8E8E93]'
                      }`}>
                        Global
                      </div>
                    ) : (
                      <>
                        <div className={`text-[10px] font-bold uppercase ${
                          isSelected ? 'text-white' : 'text-[#8E8E93]/80'
                        }`}>
                          {parsed.code}
                        </div>
                        <div className={`text-[10px] truncate max-w-full leading-tight ${
                          isSelected ? 'text-white font-semibold' : 'text-[#8E8E93]'
                        }`}>
                          {parsed.name}
                        </div>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionModal;

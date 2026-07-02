
import React from 'react';
import { GlobeIcon, SearchIcon } from './icons';

interface HeaderProps {
    onOpenReminderModal: () => void;
    onOpenRegionModal: () => void;
    onOpenSearch: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenReminderModal, onOpenRegionModal, onOpenSearch }) => {
  return (
    <header className="flex items-center justify-between p-4 pb-2 h-16 flex-shrink-0 bg-transparent select-none z-10">
      {/* Brand logo in premium gold gradient */}
      <h1 
        className="text-[26px] font-bold tracking-tight bg-gradient-to-r from-[#d0ae69] via-[#ecd199] to-[#ad883d] bg-clip-text text-transparent select-none font-sans" 
        translate="no"
      >
        Livenza
      </h1>
      
      {/* Utility items */}
      <div className="flex items-center gap-4">
        {/* Notification Bell Button */}
        <button 
          onClick={onOpenReminderModal}
          className="relative flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer focus:outline-none border-none bg-transparent"
        >
          {/* Outlined sleek notification bell icon matching the screenshot */}
          <svg className="w-6 h-6 fill-none stroke-current" strokeWidth="1.75" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-[#e1593c] text-white font-bold text-[9px] flex items-center justify-center rounded-full ring-1 ring-black animate-pulse">
            1
          </span>
        </button>

        {/* Region/Language Button */}
        <button 
          onClick={onOpenRegionModal} 
          className="flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer focus:outline-none border-none bg-transparent"
        >
          <GlobeIcon className="w-6 h-6" />
        </button>

        {/* Search Button */}
        <button 
          onClick={onOpenSearch} 
          className="flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer focus:outline-none border-none bg-transparent"
        >
          <SearchIcon className="w-5 h-5 stroke-[1.75]" />
        </button>
      </div>
    </header>
  );
};

export default Header;

import React from 'react';

interface CameraPermissionModalProps {
  isOpen: boolean;
  permissionType: 'idle' | 'camera' | 'microphone';
  onAllowAlways: () => void;
  onAllowOnce: () => void;
  onDeny: () => void;
  onClose: () => void;
}

const AudioPermissionIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[52px] h-[52px] text-white">
    {/* Capsule body */}
    <rect x="20" y="8" width="8" height="18" rx="4" fill="currentColor" />
    {/* Grille cuts */}
    <line x1="21.5" y1="13" x2="26.5" y2="13" stroke="#000000" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="21.5" y1="17" x2="26.5" y2="17" stroke="#000000" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="21.5" y1="21" x2="26.5" y2="21" stroke="#000000" strokeWidth="1.6" strokeLinecap="round" />
    {/* U Bracket */}
    <path d="M14 20C14 25.5 18 29.5 24 29.5C30 29.5 34 25.5 34 20" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    {/* Stem and block base */}
    <path d="M24 29.5V37" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M18 37H30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const VideoPermissionIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[52px] h-[52px] text-white">
    {/* Camera Body with beautiful glossy feel */}
    <rect x="10" y="15" width="28" height="21" rx="5" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.15" />
    {/* Top flash hump / bracket */}
    <path d="M18 15L20 10H28L30 15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" />
    {/* Lens ring */}
    <circle cx="24" cy="25.5" r="5.5" stroke="currentColor" strokeWidth="3" fill="#000000" />
    <circle cx="24" cy="25.5" r="2" fill="currentColor" />
  </svg>
);

const CloseButtonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-white opacity-90">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CameraPermissionModal: React.FC<CameraPermissionModalProps> = ({ isOpen, permissionType, onAllowAlways, onAllowOnce, onDeny, onClose }) => {
  const contentMap = {
    camera: {
      icon: <VideoPermissionIcon />,
      title: 'Permitir que o app LiveGo tire fotos e grave vídeos?',
    },
    microphone: {
      icon: <AudioPermissionIcon />,
      title: 'Permitir que o app LiveGo grave áudio?',
    },
  };

  if (!isOpen || permissionType === 'idle') {
    return null;
  }
  
  const currentContent = contentMap[permissionType];
  
  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`bg-black border border-[#212025]/50 rounded-[28px] p-6 w-[88vw] max-w-[340px] text-center text-white transform transition-all duration-300 ease-out ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} shadow-[0_24px_64px_rgba(0,0,0,0.9)] relative`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Right custom circular X close button */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 bg-[#201f23] hover:bg-[#2c2b30] p-2 rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer"
            aria-label="Fechar"
        >
            <CloseButtonIcon />
        </button>

        {/* Center Permission Icon wrapper */}
        <div className="flex justify-center mt-5 mb-5 select-none">
          {currentContent.icon}
        </div>

        {/* Dynamic Title */}
        <h2 className="text-[19px] font-bold tracking-normal text-white px-2 mb-6 leading-[1.38] select-none text-center">
          {currentContent.title}
        </h2>

        {/* Vertical CTA Options stack */}
        <div className="flex flex-col space-y-3.5 w-full">
          <button
            onClick={onAllowAlways}
            className="w-full bg-[#137ffb] hover:bg-[#228aff] active:scale-[0.98] text-white font-semibold rounded-full py-4 px-5 text-[15px] cursor-pointer shadow-[0_4px_24px_rgba(19,127,251,0.45)] transition-all duration-150"
          >
            Durante o uso do app
          </button>
          
          <button
            onClick={onAllowOnce}
            className="w-full bg-[#201f23] hover:bg-[#2c2b30] active:scale-[0.98] text-white font-semibold rounded-full py-4 px-5 text-[15px] cursor-pointer transition-all duration-150"
          >
            Apenas esta vez
          </button>
          
          <button
            onClick={onDeny}
            className="w-full bg-[#201f23] hover:bg-[#2c2b30] active:scale-[0.98] text-white font-semibold rounded-full py-4 px-5 text-[15px] cursor-pointer transition-all duration-150"
          >
            Não permitir
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraPermissionModal;



import React from 'react';

// Custom premium SVGs matching quality and style of the app
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

interface ResolutionPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectResolution: (resolution: string) => void;
    currentResolution: string;
}

const qualityOptions = [
    { key: '1080p', label: '1080p (Full HD)' },
    { key: '720p', label: '720p (HD)' },
    { key: '480p', label: '480p (Padrão)' },
    { key: '360p', label: '360p (Fluente)' },
];

const ResolutionPanel: React.FC<ResolutionPanelProps> = ({ isOpen, onClose, onSelectResolution, currentResolution }) => {
    return (
        <div 
            className={`absolute inset-0 z-50 flex items-end justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100 bg-transparent' : 'opacity-0 pointer-events-none'}`} 
            onClick={onClose}
        >
            <div
                className={`bg-[#131124] w-full max-w-md rounded-t-[2.2rem] shadow-[0_-8px_32px_rgba(0,0,0,0.5)] text-white transform transition-transform duration-300 ease-out border-t border-white/[0.04] p-6 pb-8 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-[20px] font-bold text-white tracking-tight font-sans">Qualidade do Vídeo</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="mb-6">
                    <p className="text-gray-400 text-[14px] leading-relaxed font-sans font-light">
                        Ajustar a qualidade pode afetar o uso de dados e a fluidez da transmissão.
                    </p>
                </div>

                <div className="space-y-3">
                    {qualityOptions.map((option) => {
                        const isSelected = currentResolution === option.key || 
                                           (option.key === '480p' && !currentResolution); // fallback standard default

                        return (
                            <button
                                key={option.key}
                                onClick={() => {
                                    onSelectResolution(option.key);
                                    onClose();
                                }}
                                className={`w-full text-left px-5 py-3.5 rounded-2xl transition-all duration-200 flex justify-between items-center text-[16px] outline-none ${
                                    isSelected
                                        ? 'bg-[#bd00ff] text-white font-semibold shadow-md'
                                        : 'text-gray-200 bg-transparent hover:bg-white/[0.04]'
                                }`}
                            >
                                <span>{option.label}</span>
                                {isSelected && <CheckIcon className="w-[18px] h-[18px]" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ResolutionPanel;

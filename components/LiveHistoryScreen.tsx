
import React from 'react';
import { StreamHistoryEntry } from '../types';
import { BackIcon } from './icons';

interface LiveHistoryScreenProps {
  isOpen: boolean;
  onClose: () => void;
  history: StreamHistoryEntry[];
}

const formatDateTime = (timestamp: any) => {
    let dateVal = timestamp;
    if (timestamp && typeof timestamp === 'object' && '$date' in timestamp) {
        dateVal = timestamp.$date;
    }
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "Data inválida";
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatDuration = (start: any, end: any) => {
    const getVal = (val: any) => {
        if (val && typeof val === 'object' && '$date' in val) {
            return new Date(val.$date).getTime();
        }
        return Number(val) || 0;
    };
    const startMs = getVal(start);
    const endMs = getVal(end);
    const durationMs = endMs - startMs;
    if (durationMs < 0) return '00:00:00';
    
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Custom SVG Icons
const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-500">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const ClockIconLocal = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-400">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
);

const HistoryItem: React.FC<{ item: StreamHistoryEntry }> = ({ item }) => (
    <div className="w-full bg-[#131215]/90 hover:bg-[#1a191d]/90 rounded-2xl flex items-center justify-between p-3 border border-[#212025]/50 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-150 mb-3 select-none">
        {/* Left Side cover thumbnail image */}
        <div className="w-[84px] h-[64px] flex-shrink-0 relative rounded-xl overflow-hidden bg-zinc-900 border border-[#2d2c32]/30">
            <img 
                src={item.avatar || 'https://picsum.photos/seed/defaultlive/200/200.jpg'} 
                alt={item.name} 
                className="w-full h-full object-cover" 
            />
        </div>
        
        {/* Middle information details */}
        <div className="flex-grow ml-3.5 flex flex-col justify-center py-0.5 min-w-0">
            <h3 className="text-white text-[14px] font-bold leading-tight line-clamp-1 mb-1.5">{item.name}</h3>
            
            <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px] font-medium leading-none mb-1">
                <CalendarIcon />
                <span className="truncate">Início: {formatDateTime(item.startTime)}</span>
            </div>
            
            <div className="flex items-center space-x-1.5 text-zinc-500 text-[11px] font-medium leading-none">
                <CalendarIcon />
                <span className="truncate">Fim: {formatDateTime(item.endTime)}</span>
            </div>
        </div>
        
        {/* Right Side custom duration badge */}
        <div className="flex-shrink-0 flex flex-col justify-center items-center ml-3 bg-[#1a191d]/95 px-3 py-1.5 rounded-xl border border-[#2d2c32]/45 min-w-[92px]">
            <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase mb-1">
                Duração
            </span>
            <div className="flex items-center justify-center space-x-1">
                <ClockIconLocal />
                <span className="text-white text-[13px] font-extrabold tracking-tight font-mono leading-none">
                    {formatDuration(item.startTime, item.endTime)}
                </span>
            </div>
        </div>
    </div>
);

const LiveHistoryScreen: React.FC<LiveHistoryScreenProps> = ({ isOpen, onClose, history }) => {
    if (!isOpen) {
        return null;
    }
    
    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col text-white font-sans animate-fade-in">
            {/* Header section with back arrow and centered custom font title */}
            <header className="flex items-center p-4 py-6 flex-shrink-0 relative bg-black">
                <button 
                    onClick={onClose} 
                    className="absolute left-4 p-1 text-gray-300 hover:text-white transition-colors"
                >
                    <BackIcon className="w-6 h-6" />
                </button>
                <div className="flex-grow text-center">
                    <h1 className="text-lg font-bold tracking-wide text-gray-100">Histórico de Lives</h1>
                </div>
            </header>
            
            {/* Main content body with smooth custom scrollbar */}
            <main className="flex-grow overflow-y-auto no-scrollbar px-4 pb-6 bg-black">
                {history.length > 0 ? (
                    history.map(item => <HistoryItem key={item.id} item={item} />)
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
                        {/* Audio equalizer visualizer for empty state placeholder */}
                        <div className="w-[75px] h-[75px] rounded-full flex items-center justify-center bg-[#131215]/90 border border-[#212025] shadow-lg mb-5 relative">
                            <div className="absolute inset-1 rounded-full border border-[#2d2c32]/30"></div>
                            {/* Inner bars */}
                            <div className="flex items-end justify-center space-x-1 z-10 h-6">
                                <div className="w-[2.5px] h-2 bg-gradient-to-t from-zinc-700 to-zinc-400 rounded-full animate-pulse"></div>
                                <div className="w-[2.5px] h-4.5 bg-gradient-to-t from-zinc-600 to-zinc-300 rounded-full animate-pulse delay-75"></div>
                                <div className="w-[2.5px] h-3 bg-gradient-to-t from-zinc-700 to-zinc-400 rounded-full animate-pulse delay-150"></div>
                            </div>
                        </div>
                        <h3 className="text-[17px] font-bold text-white tracking-wide">
                            Nenhum histórico de lives
                        </h3>
                        <p className="text-[13px] mt-2 text-zinc-500 max-w-[200px] leading-relaxed">
                            O histórico de transmissões aparecerá aqui quando as transmissões terminarem.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LiveHistoryScreen;

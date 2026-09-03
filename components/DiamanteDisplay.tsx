import React, { useState, useEffect, useRef } from 'react';
import { GoldCoinWithGIcon } from './icons';

const useCountUp = (end: number, duration = 1000) => {
    const [count, setCount] = useState(0);
    const frameRef = useRef(0);
    const startCountRef = useRef(0);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            setCount(end);
            startCountRef.current = end;
            isFirstRender.current = false;
            return;
        }

        const startCount = startCountRef.current;
        const range = end - startCount;
        let startTime: number | null = null;

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.floor(startCount + range * progress));

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(step);
            } else {
                startCountRef.current = end;
            }
        };

        frameRef.current = requestAnimationFrame(step);

        return () => cancelAnimationFrame(frameRef.current);
    }, [end, duration]);

    return count;
};

interface DiamanteDisplayProps {
    diamonds: number;
}

const DiamanteDisplay: React.FC<DiamanteDisplayProps> = ({ diamonds }) => {
    const formattedDiamonds = useCountUp(diamonds ?? 0);
    const [isGlowing, setIsGlowing] = useState(false);
    const prevDiamondsRef = useRef(diamonds);

    useEffect(() => {
        if (diamonds > prevDiamondsRef.current) {
            setIsGlowing(true);
            const timer = setTimeout(() => setIsGlowing(false), 800);
            return () => clearTimeout(timer);
        }
        if (diamonds !== prevDiamondsRef.current) {
            prevDiamondsRef.current = diamonds;
        }
    }, [diamonds]);

    return (
        <div className={`relative bg-gradient-to-br from-[#17161b] to-[#0c0d10] border border-[#f59e0b]/15 p-6 rounded-2xl shadow-[0_4px_25px_rgba(234,179,8,0.04)] overflow-hidden my-4 transition-all duration-300 ${isGlowing ? 'ring-2 ring-amber-500/50 scale-[1.01]' : ''}`}>
            <div className="absolute inset-0 bg-radial-gradient from-white/[0.01] to-transparent opacity-40"></div>

            <div className="relative z-10 flex flex-col">
                <p className="text-[11px] font-bold text-[#8e9196] uppercase tracking-wider mb-3">MEUS DIAMANTES</p>
                
                <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-[#0a0a0d]/90 rounded-xl border border-[#d97706]/35 flex items-center justify-center p-1.5 shadow-inner">
                        <GoldCoinWithGIcon className="w-10 h-10 drop-shadow-[0_2px_8px_rgba(251,191,36,0.45)]" />
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[42px] font-black text-white leading-none font-sans tracking-tight">
                            {formattedDiamonds.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[12px] text-gray-500 font-bold mt-1 inline-block">
                            diamantes
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiamanteDisplay;

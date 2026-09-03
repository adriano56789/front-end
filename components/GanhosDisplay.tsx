import React from 'react';
import { GoldCoinWithGIcon } from './icons';

interface GanhosDisplayProps {
    earnings: number;
}

const GanhosDisplay: React.FC<GanhosDisplayProps> = ({ earnings }) => {
    const displayValue = earnings || 0;

    return (
        <div className="relative bg-[#141316] p-5 py-6 rounded-3xl overflow-hidden my-3 shadow-sm">
            <div className="relative z-10 flex flex-col">
                <p className="text-[13px] font-semibold text-[#8a8894] mb-3 ml-2">Disponível para saque</p>
                <div className="flex items-center space-x-3 ml-2">
                    <GoldCoinWithGIcon className="w-[50px] h-[55px] drop-shadow-[0_4px_16px_rgba(234,179,8,0.35)]" />
                    <span className="text-[46px] font-black text-white tracking-tight leading-none mt-1 drop-shadow-md">
                        {displayValue.toLocaleString('pt-BR')}
                    </span>
                </div>
                <p className="self-end text-[11px] font-black tracking-widest text-[#3b3a40] uppercase mt-2 mr-2">GANHOS</p>
            </div>
        </div>
    );
};

export default GanhosDisplay;

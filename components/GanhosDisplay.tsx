import React, { useState, useEffect, useRef } from 'react';
import { GoldCoinWithGIcon } from './icons';
import { useTranslation } from '../i18n';

const Golden3DAmberDiamondLarge = () => (
    <svg viewBox="0 0 24 24" className="w-[50px] h-[55px] drop-shadow-[0_4px_16px_rgba(234,179,8,0.35)]" xmlns="http://www.w3.org/2000/svg">
        <g>
            {/* Left face */}
            <polygon points="12,2 4,11 12,22" fill="url(#goldFaceL-l)" />
            {/* Right face */}
            <polygon points="12,2 20,11 12,22" fill="url(#goldFaceR-l)" />
            {/* Top-left slant */}
            <polygon points="12,2 7,11 12,11" fill="#fef08a" />
            {/* Top-right slant */}
            <polygon points="12,2 17,11 12,11" fill="#fde047" />
        </g>
        <defs>
            <linearGradient id="goldFaceL-l" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#ca8a04" />
                <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
            <linearGradient id="goldFaceR-l" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
        </defs>
    </svg>
);


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
                    <Golden3DAmberDiamondLarge />
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
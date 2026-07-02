import React from 'react';

export const FrameBlueCrystal: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="royalGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF2A8" />
        <stop offset="25%" stopColor="#FFD363" />
        <stop offset="50%" stopColor="#C48C24" />
        <stop offset="75%" stopColor="#FFDB73" />
        <stop offset="100%" stopColor="#A36B15" />
      </linearGradient>
      <filter id="glowGold">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <style>
        {`
          .sparkle { animation: twinkle 2s infinite ease-in-out alternate; transform-origin: center; transform-box: fill-box; }
          .sparkle:nth-child(2) { animation-delay: 0.5s; }
          .sparkle:nth-child(3) { animation-delay: 1.2s; }
          .ring-rotate { animation: rotate 10s linear infinite; transform-origin: center; }
          @keyframes twinkle { 0% { opacity: 0.3; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1.2); } }
          @keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}
      </style>
    </defs>
    <g className="ring-rotate">
      <circle cx="50" cy="50" r="46" fill="none" stroke="url(#royalGold)" strokeWidth="6" strokeLinecap="round" strokeDasharray="15 5 5 5" filter="url(#glowGold)"/>
      <circle cx="50" cy="50" r="41" fill="none" stroke="#FFDF73" strokeWidth="1" strokeDasharray="4 2"/>
      <circle cx="50" cy="50" r="51" fill="none" stroke="#FFDF73" strokeWidth="1" strokeDasharray="4 2"/>
    </g>
    
    <path className="sparkle" d="M12,12 L15,5 L18,12 L25,15 L18,18 L15,25 L12,18 L5,15 Z" fill="#FFFFFF" transform="translate(4,4) scale(0.6)" filter="url(#glowGold)" />
    <path className="sparkle" d="M75,18 L78,11 L81,18 L88,21 L81,24 L78,31 L75,24 L68,21 Z" fill="#FFFBE6" transform="translate(0,6) scale(0.5)" filter="url(#glowGold)" />
    <path className="sparkle" d="M50,85 L52,78 L54,85 L61,87 L54,89 L52,96 L50,89 L43,87 Z" fill="#FFFFFF" transform="translate(-10,-8) scale(0.7)" filter="url(#glowGold)" />
  </svg>
);

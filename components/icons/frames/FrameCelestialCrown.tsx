import React from 'react';

export const FrameCelestialCrown: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cosmicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#0ea5e9" />
      </linearGradient>
      <filter id="cosmicGlow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="lensGlow">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
           <feMergeNode in="blur" />
           <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <style>
        {`
          .cosmic-spin { transform-origin: 50px 50px; animation: spin-cosmic 5s linear infinite; }
          .lens-pulse { animation: pulse-lens 3s ease-in-out infinite alternate; }
          @keyframes spin-cosmic { 100% { transform: rotate(360deg); } }
          @keyframes pulse-lens { 0% { opacity: 0.7; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1.1); } }
        `}
      </style>
    </defs>
    
    {/* Base Ring with Blur */}
    <circle cx="50" cy="50" r="43" fill="none" stroke="url(#cosmicGrad)" strokeWidth="6" opacity="0.3" filter="url(#lensGlow)"/>

    <g className="cosmic-spin">
      {/* Main Sharp Ring */}
      <circle cx="50" cy="50" r="43" fill="none" stroke="url(#cosmicGrad)" strokeWidth="4" filter="url(#cosmicGlow)"/>
      <circle cx="50" cy="50" r="43" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="30 70" opacity="0.8"/>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#818cf8" strokeWidth="1" strokeDasharray="5 15"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="10 20"/>
      
      {/* Flare Lens Spot */}
      <g transform="translate(50, 7)" className="lens-pulse">
        <ellipse cx="0" cy="0" rx="10" ry="2" fill="#FFFFFF" filter="url(#cosmicGlow)"/>
        <ellipse cx="0" cy="0" rx="2" ry="10" fill="#FFFFFF" filter="url(#cosmicGlow)"/>
        <circle cx="0" cy="0" r="4" fill="#E0F2FE" filter="url(#lensGlow)"/>
      </g>
    </g>
  </svg>
);

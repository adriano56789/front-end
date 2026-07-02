import React from 'react';

export const FrameBaroqueElegance: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7DD3FC" />
        <stop offset="50%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#E0F2FE" />
      </linearGradient>
      <filter id="iceGlow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <style>
        {`
          .ice-spin { transform-origin: 50px 50px; animation: spin-ice 20s linear infinite alternate; }
          .shatter-gleam { animation: gleam-ice 3s infinite; }
          @keyframes spin-ice { 100% { transform: rotate(360deg); } }
          @keyframes gleam-ice { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; filter: brightness(1.5) drop-shadow(0 0 5px #7DD3FC); } }
        `}
      </style>
    </defs>
    
    <g className="ice-spin">
      {/* Base Ice Ring */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#bae6fd" strokeWidth="4" opacity="0.6"/>
      <circle cx="50" cy="50" r="43" fill="none" stroke="url(#iceGrad)" strokeWidth="2"/>
      
      {/* Crystals pointing out */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <g key={i} transform={`rotate(${angle} 50 50) translate(50, 4)`} className="shatter-gleam" style={{ animationDelay: `${i * 0.4}s` }}>
          <polygon points="-6,10 0,0 6,10 0,16" fill="url(#iceGrad)" stroke="#38bdf8" strokeWidth="1" filter="url(#iceGlow)"/>
          <path d="M0,0 L0,16" stroke="#f0f9ff" strokeWidth="1"/>
        </g>
      ))}

      {/* Small Crystals */}
      {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle, i) => (
        <g key={`small-${i}`} transform={`rotate(${angle} 50 50) translate(50, 8)`} opacity="0.8">
          <polygon points="-4,8 0,2 4,8 0,12" fill="#7dd3fc" stroke="#0284c7" strokeWidth="0.5"/>
        </g>
      ))}
    </g>
  </svg>
);

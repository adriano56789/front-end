import React from 'react';

export const FrameNeonFeathers: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#7F1D1D" />
        <stop offset="40%" stopColor="#EA580C" />
        <stop offset="80%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#FDE047" />
      </linearGradient>
      <linearGradient id="dragonGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="30%" stopColor="#FBBF24" />
        <stop offset="70%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="jawGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#B45309" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <filter id="dragonGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <style>
        {`
          .dragon-ring { transform-origin: 50px 50px; animation: ring-pulse 4s ease-in-out infinite; }
          .dragon-head-group { transform-origin: 78px 74px; animation: head-breath 3s ease-in-out infinite; }
          .fire-flare { transform-origin: 8px -2px; animation: flare-breath 1.5s ease-in-out infinite; }
          .claws-grip { transform-origin: 24px 76px; animation: claw-twitch 5s ease-in-out infinite; }
          .eye-blink { animation: blink-cycle 4s duration ease infinite; }
          .puff-particle { animation: puff-rise 2s infinite linear; }
          
          @keyframes ring-pulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.4)); }
            50% { transform: scale(1.02); filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.7)); }
          }
          @keyframes head-breath {
            0%, 100% { transform: scale(1) translateY(0px) rotate(0deg); }
            50% { transform: scale(1.03) translateY(-1px) rotate(1.5deg); }
          }
          @keyframes flare-breath {
            0%, 100% { transform: scale(0.8) translate(0, 0); opacity: 0.6; }
            50% { transform: scale(1.2) translate(-3px, 1px); opacity: 0.95; }
          }
          @keyframes claw-twitch {
            0%, 90%, 100% { transform: rotate(0) scale(1); }
            95% { transform: rotate(-3deg) scale(1.04); }
          }
          @keyframes blink-cycle {
            0%, 90%, 100% { opacity: 1; transform: scaleY(1); }
            95% { opacity: 0.1; transform: scaleY(0.1); }
          }
          @keyframes puff-rise {
            0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
            20% { opacity: 0.8; }
            80% { opacity: 0.4; }
            100% { transform: translate(-12px, -8px) scale(1.2); opacity: 0; }
          }
        `}
      </style>
    </defs>
    
    {/* Background circular glowing field */}
    <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(127, 29, 29, 0.2)" strokeWidth="4" />
    
    {/* Body of the Dragon forming the Ring */}
    <g className="dragon-ring">
      {/* Golden Glowing Outer Ring */}
      <circle cx="50" cy="50" r="41.5" fill="none" stroke="url(#dragonGold)" strokeWidth="2.8" filter="url(#dragonGlow)" />
      
      {/* Inner fiery border */}
      <circle cx="50" cy="50" r="38.5" fill="none" stroke="url(#fireGrad)" strokeWidth="1.2" opacity="0.9" />
      
      {/* Beautiful interlocking scales pattern on the rim */}
      {[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336].map((deg) => (
        <path 
          key={deg}
          d="M 50 8.5 A 41.5 41.5 0 0 1 54 9.5 C 53 11, 47 11, 46 9.5 Z" 
          fill="url(#fireGrad)" 
          transform={`rotate(${deg} 50 50)`}
          opacity="0.85"
        />
      ))}
      
      {/* Small scale highlights */}
      {[12, 36, 60, 84, 108, 132, 156, 180, 204, 228, 252, 276, 300, 324, 348].map((deg) => (
        <circle 
          key={deg}
          cx="50" 
          cy="9" 
          r="0.8" 
          fill="#FDE047" 
          transform={`rotate(${deg} 50 50)`}
          filter="url(#eyeGlow)"
        />
      ))}

      {/* Dragon tail detail wrapping on the top-left (around angle 225 deg = pos 21, 21) */}
      <g transform="translate(22, 22) rotate(-135) scale(0.8)">
        {/* Main Tail Wing / Fin Structure */}
        <path d="M 0 -2 Q -15 -8 -22 4 Q -10 10 0 3" fill="url(#dragonGold)" filter="url(#dragonGlow)" />
        <path d="M -8 1 Q -19 12 -28 5 Q -20 -4 -8 1" fill="url(#fireGrad)" />
        {/* Sharp tail tip spikes */}
        <path d="M -22 4 Q -32 6 -30 1 Q -24 -2 -22 4 Z" fill="#F87171" />
        <path d="M -28 5 Q -36 12 -33 15 Q -29 8 -28 5 Z" fill="#EF4444" />
        {/* Tail barbs */}
        <circle cx="-12" cy="5" r="1.2" fill="#FBBF24" />
        <circle cx="-4" cy="2" r="1" fill="#FBBF24" />
      </g>
    </g>

    {/* Dragon Claw gripping the cylinder/rim on bottom left (co-ordinate 24, 76) */}
    <g className="claws-grip" transform="translate(23.5, 76.5) scale(0.75) rotate(-30)">
      {/* Golden claw hand */}
      <path d="M0,0 Q-4,-10 -12,-8 C-16,-7 -18,-12 -12,-15 C-4,-18 4,-12 6,-6 Z" fill="url(#dragonGold)" filter="url(#dragonGlow)" />
      {/* 3 Razor Sharp Glowing Claws/Fingers curving around avatar */}
      <path d="M-6,-11 Q-14,-22 -19,-20 C-15,-16 -10,-11 -6,-11 Z" fill="#FFFBEB" filter="url(#eyeGlow)" stroke="#D97706" strokeWidth="0.5" />
      <path d="M-10,-6 Q-22,-14 -25,-10 C-18,-7 -12,-5 -10,-6 Z" fill="#FFFBEB" filter="url(#eyeGlow)" stroke="#D97706" strokeWidth="0.5" />
      <path d="M-1,-14 Q-5,-28 -9,-28 C-7,-21 -4,-15 -1,-14 Z" fill="#FFFBEB" filter="url(#eyeGlow)" stroke="#D97706" strokeWidth="0.5" />
      {/* Base skin fold */}
      <circle cx="2" cy="-4" r="3" fill="#D97706" opacity="0.6" />
    </g>

    {/* Epic Detailed Animated Golden Dragon Head at the bottom right corner (approx 78, 74) */}
    <g className="dragon-head-group">
      {/* Spine Fins / Back Hair */}
      <path d="M 68 56 Q 62 44 54 48 C 60 54 66 58 68 56 Z" fill="#EA580C" filter="url(#dragonGlow)" />
      <path d="M 72 52 Q 68 38 58 40 C 66 48 70 52 72 52 Z" fill="#F59E0B" filter="url(#dragonGlow)" />
      <path d="M 76 48 Q 72 32 64 34 C 70 42 74 48 76 48 Z" fill="#FDE047" />

      {/* Main Back Horn - Majestic curving design */}
      <path d="M 74 62 Q 68 46 52 38 C 55 46 64 52 74 62 Z" fill="url(#dragonGold)" filter="url(#dragonGlow)" stroke="#78350F" strokeWidth="0.6" />
      <path d="M 76 66 Q 74 54 62 48 C 66 54 72 60 76 66 Z" fill="url(#dragonGold)" opacity="0.8" />

      {/* Dragon Head Skull Base */}
      <path d="M 72 68 Q 70 56 79 58 Q 88 56 89 68 Q 88 78 82 82 Q 74 84 72 68 Z" fill="url(#dragonGold)" filter="url(#dragonGlow)" />
      
      {/* Sharp Cheek Spikes */}
      <path d="M 72 68 L 64 68 L 71 74 Z" fill="#D97706" />
      <path d="M 71 74 L 62 76 L 71 80 Z" fill="#B45309" />

      {/* Snout with Nostril detail */}
      <path d="M 86 64 C 91 63 95 65 96 68 C 96 72 90 73 87 73 Z" fill="url(#dragonGold)" />
      <circle cx="92" cy="67" r="1.1" fill="#1E1B4B" />

      {/* Glowing Demonic Orange-Red Dragon Eye */}
      <polygon points="78,65 83,64 82,68 77,68" fill="#1E1B4B" />
      <path className="eye-blink" d="M 79 64.5 Q 81.5 63 82.5 66 Q 80 67 79 64.5 M 79 64.5 Z" fill="#EF4444" filter="url(#eyeGlow)" />
      <ellipse cx="81" cy="65.2" rx="0.8" ry="1.2" fill="#FDE047" />
      
      {/* Open Fiery Maw/Mouth with visible sharp fangs */}
      <path d="M 87 73 Q 91 74 92 78 Q 84 78 84 73 Z" fill="#5F1603" />
      {/* Small sharp white teeth */}
      <polygon points="86,73 87.5,75 89,73" fill="#FFF" />
      <polygon points="90,73 91.2,75.5 92.5,73" fill="#FFF" />
      <polygon points="88,77.5 89,75.5 90,77.5" fill="#FFF" />
      
      {/* Lower Jaw bone */}
      <path d="M 84 76 Q 89 77 91 79 C 88 83 80 82 78 76" fill="url(#jawGrad)" />
      
      {/* Golden chin beard whisk */}
      <path d="M 82 81 Q 86 89 88 92 Q 83 87 81 81 Z" fill="#FBBF24" />

      {/* Dynamic Animated Flame Breath & Spark Ejection */}
      <g className="fire-flare" transform="translate(87, 76.5) rotate(15)">
        {/* Core fire breath shape */}
        <path d="M 0 -2 C 6 -12, 14 -14, 20 -8 C 24 0, 15 12, 0 4 Z" fill="url(#fireGrad)" filter="url(#dragonGlow)" />
        <path d="M 1 -1 C 4 -6, 10 -8, 13 -4 C 15 1, 10 7, 1 2 Z" fill="#FEF08A" />
        
        {/* Continuous ember floats breaking off from mouth */}
        {Array.from({ length: 4 }).map((_, i) => (
          <circle 
            key={i} 
            className="puff-particle" 
            cx="3" 
            cy="-1" 
            r="1.8" 
            fill="#F59E0B" 
            filter="url(#eyeGlow)" 
            style={{ animationDelay: `${i * 0.5}s` }} 
          />
        ))}
      </g>
    </g>
  </svg>
);

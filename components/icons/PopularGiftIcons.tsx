import React from 'react';

// 1. Coração (❤️)
export const CoracaoGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <radialGradient id="heart3D" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFF2F2" />
        <stop offset="25%" stopColor="#FF3E6C" />
        <stop offset="70%" stopColor="#D80043" />
        <stop offset="100%" stopColor="#7A0022" />
      </radialGradient>
      <linearGradient id="heartGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF85A1" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#FF3E6C" stopOpacity="0" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#FF3E6C" floodOpacity="0.35" />
      </filter>
    </defs>
    {/* Glow de fundo */}
    <path d="M60,103 C40,85 14,60 14,39 C14,21 28,8 45,8 C55,8 60,18 60,18 C60,18 65,8 75,8 C92,8 106,21 106,39 C106,60 80,85 60,103 Z" fill="url(#heartGlow)" filter="blur(8px)" opacity="0.6" />
    {/* Coração 3D principal */}
    <path d="M60,102 C38,83 12,57 12,36 C12,18 26.5,5 44,5 C54.5,5 60,15 60,15 C60,15 65.5,5 76,5 C93.5,5 108,18 108,36 C108,57 82,83 60,102 Z" fill="url(#heart3D)" filter="url(#shadow)" />
    {/* Brilho reflexo fofinho superior left */}
    <ellipse cx="38" cy="24" rx="14" ry="7" transform="rotate(-30 38 24)" fill="#FFFFFF" opacity="0.75" />
    <circle cx="28" cy="30" r="4" fill="#FFFFFF" opacity="0.6" />
  </svg>
);

// 2. Rosa (🌹)
export const RosaGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="roseStem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2E7D32" />
        <stop offset="100%" stopColor="#1B5E20" />
      </linearGradient>
      <linearGradient id="roseLeaves" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4CAF50" />
        <stop offset="100%" stopColor="#2E7D32" />
      </linearGradient>
      <radialGradient id="rosePetalCenter" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FF1E56" />
        <stop offset="60%" stopColor="#E3003B" />
        <stop offset="100%" stopColor="#800020" />
      </radialGradient>
      <linearGradient id="rosePetalLip" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF85A1" />
        <stop offset="100%" stopColor="#FF1E56" />
      </linearGradient>
    </defs>
    {/* Haste / Stem */}
    <path d="M60,50 Q60,95 55,108" fill="none" stroke="url(#roseStem)" strokeWidth="6" strokeLinecap="round" />
    <path d="M55,108 Q52,112 50,115" fill="none" stroke="url(#roseStem)" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
    {/* Espinho 1 */}
    <path d="M59,65 Q65,65 67,61" fill="none" stroke="url(#roseStem)" strokeWidth="4" strokeLinecap="round" />
    {/* Leaf Esquerda */}
    <path d="M59,75 Q30,75 38,60 C46,62 55,70 58,74 Z" fill="url(#roseLeaves)" />
    <path d="M38,60 Q48,68 58,74" fill="none" stroke="#1B5E20" strokeWidth="1.5" />
    {/* Leaf Direita */}
    <path d="M59,88 Q88,84 82,70 C72,72 64,80 60,86 Z" fill="url(#roseLeaves)" />
    <path d="M82,70 Q72,78 60,86" fill="none" stroke="#1B5E20" strokeWidth="1.5" />
    
    {/* Cálice Verde (Cálice de suporte) */}
    <path d="M42,42 C45,55 75,55 78,42 C82,30 38,30 42,42 Z" fill="#2E7D32" />
    <path d="M47,48 C51,56 69,56 73,48 L60,58 Z" fill="#1B5E20" />

    {/* Pétalas da Rosa (Modelo 3D sobreposto espiral) */}
    {/* Pétala grande externa de trás */}
    <path d="M32,38 C20,20 40,5 60,18 C80,5 100,20 88,38 C75,52 45,52 32,38 Z" fill="url(#rosePetalCenter)" />
    
    {/* Pétalas intermediárias */}
    <path d="M38,32 C30,18 45,14 60,25 C75,14 90,18 82,32 C74,44 46,44 38,32 Z" fill="url(#rosePetalLip)" opacity="0.95" />
    <path d="M44,28 C40,18 50,16 60,24 C70,16 80,18 76,28 C70,36 50,36 44,28 Z" fill="url(#rosePetalCenter)" />
    
    {/* Miolo Espiral Realista */}
    <path d="M52,24 C50,20 54,16 60,20 C66,16 70,20 68,24 C64,28 56,28 52,24 Z" fill="#FFA3B1" />
    <path d="M57,22 C56,21 58,19 60,20 C62,19 64,21 63,22 C61,24 59,24 57,22 Z" fill="#990022" />
  </svg>
);

// 3. Flor / Buquê (💐)
export const FlorGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="wrapperGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFE0B2" />
        <stop offset="100%" stopColor="#FFA726" />
      </linearGradient>
      <linearGradient id="stemGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#81C784" />
        <stop offset="100%" stopColor="#388E3C" />
      </linearGradient>
      <radialGradient id="pinkFlower" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FF80AB" />
        <stop offset="70%" stopColor="#FF4081" />
        <stop offset="100%" stopColor="#C51162" />
      </radialGradient>
      <radialGradient id="purpleFlower" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#E040FB" />
        <stop offset="70%" stopColor="#D500F9" />
        <stop offset="100%" stopColor="#4A148C" />
      </radialGradient>
      <radialGradient id="blueFlower" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#00E5FF" />
        <stop offset="75%" stopColor="#00B0FF" />
        <stop offset="100%" stopColor="#2962FF" />
      </radialGradient>
      <filter id="shadowSimple" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
      </filter>
    </defs>
    
    {/* Hastes Verdes de Fundo */}
    <path d="M55,60 L45,110 M60,60 L60,115 M65,60 L75,110" stroke="url(#stemGrad)" strokeWidth="4.5" strokeLinecap="round" />
    
    {/* Papel de Embrulho Traseiro */}
    <path d="M30,55 C15,75 50,105 60,105 C70,105 105,75 90,55 Z" fill="url(#wrapperGrad)" filter="url(#shadowSimple)" />

    {/* Folhas Verdes entre Flores */}
    <path d="M40,42 Q30,25 45,28 Z" fill="#4CAF50" />
    <path d="M80,42 Q90,25 75,28 Z" fill="#4CAF50" />
    <path d="M60,35 Q60,15 50,22 Z" fill="#388E3C" />

    {/* Flor de Cima (Rosa/Lilás) */}
    <g transform="translate(60, 32)">
      <circle cx="0" cy="-10" r="10" fill="url(#pinkFlower)" />
      <circle cx="-10" cy="0" r="10" fill="url(#pinkFlower)" />
      <circle cx="10" cy="0" r="10" fill="url(#pinkFlower)" />
      <circle cx="0" cy="10" r="10" fill="url(#pinkFlower)" />
      <circle cx="0" cy="0" r="10" fill="radial-gradient(circle, #FFF 0%, #FF80AB 100%)" />
      <circle cx="0" cy="0" r="6" fill="#FFEB3B" />
    </g>

    {/* Flor da Esquerda (Violeta) */}
    <g transform="translate(38, 48)">
      <circle cx="0" cy="-8" r="8" fill="url(#purpleFlower)" />
      <circle cx="-8" cy="0" r="8" fill="url(#purpleFlower)" />
      <circle cx="8" cy="0" r="8" fill="url(#purpleFlower)" />
      <circle cx="0" cy="8" r="8" fill="url(#purpleFlower)" />
      <circle cx="0" cy="0" r="5" fill="#FFEB3B" />
    </g>

    {/* Flor da Direita (Azul Celeste) */}
    <g transform="translate(82, 48)">
      <circle cx="0" cy="-8" r="8" fill="url(#blueFlower)" />
      <circle cx="-8" cy="0" r="8" fill="url(#blueFlower)" />
      <circle cx="8" cy="0" r="8" fill="url(#blueFlower)" />
      <circle cx="0" cy="8" r="8" fill="url(#blueFlower)" />
      <circle cx="0" cy="0" r="5" fill="#FFEB3B" />
    </g>

    {/* Papel de Embrulho Frontal Dobrado */}
    <path d="M38,62 L60,105 L30,55 Z" fill="#FFA726" opacity="0.8" />
    <path d="M82,62 L60,105 L90,55 Z" fill="#FB8C00" opacity="0.9" />

    {/* Fita Vermelha de Laço */}
    <path d="M48,82 Q60,86 72,82" fill="none" stroke="#E91E63" strokeWidth="6" strokeLinecap="round" />
    {/* Laço Central */}
    <circle cx="60" cy="84" r="5" fill="#C2185B" />
    <path d="M60,84 Q50,75 48,82 Z" fill="#E91E63" />
    <path d="M60,84 Q70,75 72,82 Z" fill="#E91E63" />
  </svg>
);

// 4. Rosca / Donut (🍩)
export const RoscaGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="doughGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F5D3A1" />
        <stop offset="70%" stopColor="#C68A4C" />
        <stop offset="100%" stopColor="#8A521A" />
      </linearGradient>
      <linearGradient id="frostingGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF9EB5" />
        <stop offset="50%" stopColor="#FF5E89" />
        <stop offset="100%" stopColor="#D81B60" />
      </linearGradient>
      <filter id="donutShadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#5D4037" floodOpacity="0.3" />
      </filter>
    </defs>
    
    {/* Massa do Donut Inteira */}
    <path d="M60,12 C30.2,12 6,36.2 6,66 C6,95.8 30.2,120 60,120 C89.8,120 114,95.8 114,66 C114,36.2 89.8,12 60,12 Z M60,82 C51.2,82 44,74.8 44,66 C44,57.2 51.2,50 60,50 C68.8,50 76,57.2 76,66 C76,74.8 68.8,82 60,82 Z" fill="url(#doughGrad)" filter="url(#donutShadow)" />
    
    {/* Cobertura de Morango Premium (Frosting) */}
    <path d="M60,18 C33.4,18 12,39.4 12,66 C12,74 15,80 18,84 Q22,88 28,82 Q34,76 38,83 Q42,90 48,84 Q54,78 60,84 Q66,90 72,83 Q78,76 84,81 Q90,86 96,82 C104,74 108,70 108,66 C108,39.4 86.6,18 60,18 Z M60,76 C54.5,76 50,71.5 50,66 C50,60.5 54.5,56 60,56 C65.5,56 70,60.5 70,66 C70,71.5 65.5,76 60,76 Z" fill="url(#frostingGrad)" />

    {/* Reflexo de brilho na cobertura */}
    <path d="M22,46 Q28,26 48,22" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" opacity="0.65" />
    <path d="M18,58 A 40,40 0 0,1 46,24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />

    {/* Granulados de Chocolates, Vermelhos e Amarelos coloridos */}
    <g id="sprinkles" opacity="0.95">
      {/* Ciano */}
      <rect x="34" y="38" width="8" height="3" rx="1.5" transform="rotate(30 34 38)" fill="#00E5FF" />
      <rect x="84" y="44" width="8" height="3" rx="1.5" transform="rotate(-40 84 44)" fill="#00E5FF" />
      {/* Amarelo */}
      <rect x="52" y="30" width="8" height="3" rx="1.5" transform="rotate(15 52 30)" fill="#FFEB3B" />
      <rect x="80" y="80" width="8" height="3" rx="1.5" transform="rotate(45 80 80)" fill="#FFEB3B" />
      {/* Roxo */}
      <rect x="25" y="72" width="8" height="3" rx="1.5" transform="rotate(-15 25 72)" fill="#D500F9" />
      <rect x="94" y="60" width="8" height="3" rx="1.5" transform="rotate(75 94 60)" fill="#D500F9" />
      {/* Branco */}
      <rect x="42" y="90" width="8" height="3" rx="1.5" transform="rotate(120 42 90)" fill="#FFFFFF" />
      <rect x="68" y="28" width="8" height="3" rx="1.5" transform="rotate(-60 68 28)" fill="#FFFFFF" />
    </g>
  </svg>
);

// 5. Balão (🎈)
export const BalaoGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <radialGradient id="balloon3D" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#FF94B8" />
        <stop offset="35%" stopColor="#FF235B" />
        <stop offset="85%" stopColor="#C50033" />
        <stop offset="100%" stopColor="#690017" />
      </radialGradient>
      <filter id="balloonShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#C30F42" floodOpacity="0.4" />
      </filter>
    </defs>
    
    {/* Fio de Linha Curvo Do Balão */}
    <path d="M60,94 Q50,105 64,115 T60,125" fill="none" stroke="#90A4AE" strokeWidth="2.5" strokeLinecap="round" />

    {/* Nó do Balão Traseiro */}
    <polygon points="60,94 53,101 67,101" fill="#C50033" />
    <ellipse cx="60" cy="98" rx="5" ry="2.5" fill="#FF235B" />

    {/* Esfera do Balão 3D */}
    <ellipse cx="60" cy="52" rx="42" ry="46" fill="url(#balloon3D)" filter="url(#balloonShadow)" />

    {/* Reflexo de Luz Curvo e Brilhante Superior Left */}
    <path d="M36,28 A 30,34 0 0,1 74,18" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.65" />
    {/* Brilho Secundário Redondo */}
    <circle cx="34" cy="46" r="4.5" fill="#FFFFFF" opacity="0.5" />
  </svg>
);

// 6. Chocolate (🍫)
export const ChocolateGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="chocGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7B3F00" />
        <stop offset="50%" stopColor="#5C3000" />
        <stop offset="100%" stopColor="#301A00" />
      </linearGradient>
      <linearGradient id="foilGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E0E0E0" />
        <stop offset="50%" stopColor="#9E9E9E" />
        <stop offset="100%" stopColor="#757575" />
      </linearGradient>
      <linearGradient id="wrapperRedGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF3E6C" />
        <stop offset="100%" stopColor="#8A0022" />
      </linearGradient>
      <filter id="chocShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#3D1C00" floodOpacity="0.4" />
      </filter>
    </defs>

    {/* Peça inteira do chocolate, rotacionada para dinamismo */}
    <g transform="rotate(-15 60 60)" filter="url(#chocShadow)">
      {/* Barra de Chocolate de Trás (Brown) */}
      <rect x="35" y="15" width="50" height="85" rx="4" fill="url(#chocGrad)" />

      {/* Ranhuras/Divisões 3D do Chocolate */}
      {/* Linha vertical central */}
      <line x1="60" y1="18" x2="60" y2="60" stroke="#3D1C00" strokeWidth="2.5" />
      {/* Linhas horizontais */}
      <line x1="38" y1="32" x2="82" y2="32" stroke="#3D1C00" strokeWidth="2.5" />
      <line x1="38" y1="48" x2="82" y2="48" stroke="#3D1C00" strokeWidth="2.5" />
      
      {/* Detalhes de brilho nas barras superiores */}
      <rect x="40" y="21" width="16" height="8" fill="#FFF" opacity="0.1" />
      <rect x="64" y="21" width="16" height="8" fill="#FFF" opacity="0.1" />
      <rect x="40" y="35" width="16" height="10" fill="#FFF" opacity="0.1" />
      <rect x="64" y="35" width="16" height="10" fill="#FFF" opacity="0.1" />

      {/* Papel Alumínio de Metal (Foil) Descascado */}
      <path d="M33,52 L87,48 L85,58 L35,62 Z" fill="url(#foilGrad)" stroke="#B0BEC5" strokeWidth="1" />
      <path d="M35,62 L85,58 L82,100 L38,100 Z" fill="url(#wrapperRedGrad)" />

      {/* Faixa Logotipo Dourado do Chocolate */}
      <rect x="37" y="70" width="46" height="15" fill="#FFC107" />
      <rect x="43" y="75" width="34" height="5" fill="#FFF" opacity="0.6" rx="2.5" />
    </g>
  </svg>
);

// 7. Batom (💄)
export const BatomGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="goldCase" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="30%" stopColor="#FFD54F" />
        <stop offset="70%" stopColor="#FFB300" />
        <stop offset="100%" stopColor="#FF8F00" />
      </linearGradient>
      <linearGradient id="blackCase" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#4A4A5A" />
        <stop offset="40%" stopColor="#1E1E26" />
        <stop offset="80%" stopColor="#0B0B0D" />
        <stop offset="100%" stopColor="#1C1C22" />
      </linearGradient>
      <linearGradient id="lipstickCream" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FF5252" />
        <stop offset="50%" stopColor="#FF1744" />
        <stop offset="100%" stopColor="#D50000" />
      </linearGradient>
      <filter id="batomShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.3" />
      </filter>
    </defs>

    {/* Batom levemente inclinado */}
    <g transform="rotate(10 60 60)" filter="url(#batomShadow)">
      {/* Corpo de Baixo Obsidian (Base) */}
      <rect x="42" y="65" width="36" height="42" rx="4" fill="url(#blackCase)" />
      {/* Faixa metálica dourada divisória de baixo */}
      <rect x="42" y="75" width="36" height="6" fill="url(#goldCase)" />

      {/* Colarinho Metálico Dourado Central */}
      <rect x="45" y="40" width="30" height="25" rx="2" fill="url(#goldCase)" />
      <line x1="45" y1="46" x2="75" y2="46" stroke="#FFA000" strokeWidth="1.5" />

      {/* Creme Slanted do Batom (Red Bullet) */}
      {/* Formato icônico de ponta inclinada */}
      <path d="M48,40 L48,16 C48,16 52,10 63,6 L72,18 L72,40 Z" fill="url(#lipstickCream)" />

      {/* Detalhe de reflexo/brilho no creme vermelho */}
      <path d="M51,18 L51,36" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      
      {/* Borda reflexo de brilho no corpo escuro */}
      <path d="M46,68 L46,102" fill="none" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
    </g>
  </svg>
);

// 8. Café (☕)
export const CafeGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="cupGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#B388FF" />
        <stop offset="50%" stopColor="#7C4DFF" />
        <stop offset="100%" stopColor="#6200EA" />
      </linearGradient>
      <linearGradient id="coffeeGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#5D4037" />
        <stop offset="100%" stopColor="#3E2723" />
      </linearGradient>
      <filter id="cupShadow" x="-10%" y="-10%" width="125%" height="125%">
        <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#311B92" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* Vento/Fumaça do café bem quentinho */}
    <g stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6">
      <path d="M46,20 Q41,12 48,5 T44,-2" />
      <path d="M60,22 Q55,10 64,3 T58,-5" />
      <path d="M74,20 Q69,12 76,5 T72,-2" />
    </g>

    <g filter="url(#cupShadow)">
      {/* Asa da Xícara (Esquerda / Direita - vamos fazer na direita) */}
      <path d="M80,48 C98,48 98,78 80,78" fill="none" stroke="url(#cupGrad)" strokeWidth="12" strokeLinecap="round" />
      <path d="M80,51 C93,51 93,75 80,75" fill="none" stroke="#4a148c" strokeWidth="4" />

      {/* Corpo principal da xícara em 3D */}
      <path d="M26,38 C26,38 23,84 60,84 C97,84 94,38 94,38 Z" fill="url(#cupGrad)" />

      {/* Borda superior redonda (para dar perspectiva elíptica) */}
      <ellipse cx="60" cy="38" rx="34" ry="10" fill="#7C4DFF" />
      {/* Líquido do Café dentro da elipse */}
      <ellipse cx="60" cy="40" rx="30" ry="7" fill="url(#coffeeGrad)" />

      {/* Desenho do Café Coração (Latte Art) */}
      <path d="M60,44 C57,41 53,41 53,44 C53,47 60,50 60,50 C60,50 67,47 67,44 C67,41 63,41 60,44 Z" fill="#FFF" opacity="0.8" />

      {/* Pratinho de base da Xícara */}
      <ellipse cx="60" cy="85" rx="45" ry="8" fill="url(#cupGrad)" opacity="0.8" />
      <ellipse cx="60" cy="87" rx="41" ry="5" fill="#4a148c" />

      {/* Brilho reflexo branco na xícara */}
      <path d="M33,48 Q30,68 45,78" fill="none" stroke="#FFF" strokeWidth="3.5" strokeLinecap="round" opacity="0.35" />
    </g>
  </svg>
);

// 9. Hambúrguer (🍔)
export const HamburguerGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="bunGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFA726" />
        <stop offset="100%" stopColor="#E65100" />
      </linearGradient>
      <linearGradient id="pattyGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#5D4037" />
        <stop offset="100%" stopColor="#3E2723" />
      </linearGradient>
      <filter id="burgerShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="1" dy="6" stdDeviation="4" floodColor="#4E342E" floodOpacity="0.4" />
      </filter>
    </defs>

    <g filter="url(#burgerShadow)">
      {/* Pão Superior (Pão de Gergelim bolha) */}
      <path d="M18,45 C18,18 102,18 102,45 Z" fill="url(#bunGrad)" />

      {/* Sementes de Gergelim decorativas */}
      <g fill="#FFF" opacity="0.85">
        <ellipse cx="40" cy="30" rx="2" ry="4" transform="rotate(35 40 30)" />
        <ellipse cx="60" cy="24" rx="2" ry="4" transform="rotate(-15 60 24)" />
        <ellipse cx="80" cy="32" rx="2" ry="4" transform="rotate(20 80 32)" />
        <ellipse cx="50" cy="36" rx="2" ry="4" transform="rotate(-40 50 36)" />
        <ellipse cx="70" cy="34" rx="2" ry="4" transform="rotate(45 70 34)" />
      </g>

      {/* Folha de Alface Ondulada Verde */}
      <path d="M14,44 Q22,40 30,44 T46,44 T62,44 T78,44 T94,44 T106,44 C110,48 106,53 102,51 C90,51 24,51 14,51 Z" fill="#4CAF50" />

      {/* Fatias de Tomate Vermelho */}
      <rect x="25" y="49" width="30" height="7" rx="3" fill="#E53935" />
      <rect x="65" y="49" width="30" height="7" rx="3" fill="#E53935" />

      {/* Queijo Cheddar Derretido Visual (Triângulos) */}
      <path d="M20,53 L35,62 L48,53 L68,66 L82,53 L96,62 L100,53 Z" fill="#FFC107" />

      {/* Hambúrguer de Carne (Patty espesso) */}
      <rect x="16" y="55" width="88" height="15" rx="7.5" fill="url(#pattyGrad)" />
      {/* Ranhuras grelhadas na carne */}
      <line x1="28" y1="58" x2="34" y2="67" stroke="#27150F" strokeWidth="2" />
      <line x1="48" y1="58" x2="54" y2="67" stroke="#27150F" strokeWidth="2" />
      <line x1="68" y1="58" x2="74" y2="67" stroke="#27150F" strokeWidth="2" />
      <line x1="88" y1="58" x2="94" y2="67" stroke="#27150F" strokeWidth="2" />

      {/* Pão de Baixo (Unidade de Suporte) */}
      <path d="M18,68 C18,78 102,78 102,68 C102,68 100,88 60,88 C20,88 18,68 18,68 Z" fill="url(#bunGrad)" />
    </g>
  </svg>
);

// 10. Perfume (🧴)
export const PerfumeGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="perfumeGlass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF2F7" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#FFC1E3" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id="perfumeLiquid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF85C0" />
        <stop offset="50%" stopColor="#FF4081" />
        <stop offset="100%" stopColor="#C51162" />
      </linearGradient>
      <linearGradient id="perfumeCap" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="50%" stopColor="#FFD54F" />
        <stop offset="100%" stopColor="#FF8F00" />
      </linearGradient>
      <filter id="perfShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#FF4081" floodOpacity="0.2" />
      </filter>
    </defs>

    <g filter="url(#perfShadow)">
      {/* Válvula de Aspiração (Canudo plástico dentro) */}
      <line x1="60" y1="36" x2="60" y2="90" stroke="#FF4081" strokeWidth="2.5" opacity="0.6" />

      {/* Líquido de Perfume Rosa na Base do Vidro */}
      <path d="M34,55 C34,55 35,95 60,95 C85,95 86,55 86,55 Z" fill="url(#perfumeLiquid)" />
      <ellipse cx="60" cy="55" rx="26" ry="6" fill="#F50057" />

      {/* Corpo de Vidro Transparente */}
      <rect x="30" y="32" width="60" height="65" rx="14" fill="url(#perfumeGlass)" stroke="#F50057" strokeWidth="2.5" />

      {/* Brilhos reflexos luminosos no vidro */}
      <path d="M36,44 Q34,74 44,88" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path d="M84,40 L84,70" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.5" />

      {/* Pescoço Metálico Dourado */}
      <rect x="52" y="24" width="16" height="10" fill="url(#perfumeCap)" />

      {/* Cabeça do Borrifador / Cap do Perfume */}
      <path d="M48,12 C48,12 50,6 60,6 C70,6 72,12 72,12 L72,24 L48,24 Z" fill="url(#perfumeCap)" />
      
      {/* Lacinho de Fita Pink */}
      <circle cx="60" cy="29" r="3.5" fill="#C51162" />
      <path d="M60,29 Q52,22 47,27 Z" fill="#FF4081" />
      <path d="M60,29 Q68,22 73,27 Z" fill="#FF4081" />

      {/* Selo Elegante no Centro */}
      <rect x="46" y="60" width="28" height="18" rx="2" fill="#FFE082" stroke="#FF8F00" strokeWidth="1" />
      <text x="60" y="72" fontSize="5" fontWeight="bold" fill="#C51162" textAnchor="middle" fontFamily="sans-serif">PARFUM</text>
    </g>
  </svg>
);

// 11. Pizza (🍕)
export const PizzaGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="crustGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFA726" />
        <stop offset="100%" stopColor="#D84315" />
      </linearGradient>
      <linearGradient id="cheeseGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="40%" stopColor="#FBC02D" />
        <stop offset="100%" stopColor="#F57600" />
      </linearGradient>
      <filter id="pizzaShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#D84315" floodOpacity="0.32" />
      </filter>
    </defs>

    {/* Pizza levemente virada de lado */}
    <g transform="rotate(-5 60 60)" filter="url(#pizzaShadow)">
      {/* Crosta de trás (Pão mais grosso) */}
      <path d="M96,30 C90,20 30,20 24,30 L60,113 Z" fill="url(#crustGrad)" />

      {/* Recheio de Queijo (Camada amarela por cima) */}
      <path d="M90,34 C80,26 40,26 30,34 L60,105 Z" fill="url(#cheeseGrad)" />

      {/* Orla da crosta dobradiça 3D */}
      <path d="M21,28 Q60,18 99,28 C104,33 94,37 88,34 Q60,26 32,34 C26,37 16,33 21,28 Z" fill="#FFB74D" />

      {/* Calabresas/Pepperonis circulares deliciosos */}
      <g fill="#D32F2F" stroke="#B71C1C" strokeWidth="1">
        {/* Superior Left */}
        <circle cx="45" cy="44" r="6" />
        <circle cx="43" cy="43" r="2" fill="#FF5252" opacity="0.6" stroke="none" />
        {/* Superior Right */}
        <circle cx="75" cy="44" r="6.5" />
        <circle cx="73" cy="43" r="2" fill="#FF5252" opacity="0.6" stroke="none" />
        {/* Centro */}
        <circle cx="60" cy="62" r="7" />
        <circle cx="58" cy="60" r="2" fill="#FF5252" opacity="0.6" stroke="none" />
        {/* Inferior */}
        <circle cx="60" cy="85" r="5" />
        <circle cx="58" cy="84" r="1.5" fill="#FF5252" opacity="0.6" stroke="none" />
      </g>

      {/* Manchinhas verdes de orégano/manjericão */}
      <g fill="#2E7D32">
        <rect x="36" y="55" width="2" height="4" rx="1" transform="rotate(30 36 55)" />
        <rect x="80" y="58" width="2.5" height="4.5" rx="1" transform="rotate(-40 80 58)" />
        <rect x="52" y="74" width="2" height="3.5" rx="1" transform="rotate(15 52 74)" />
        <rect x="65" y="48" width="2" height="4" rx="1" transform="rotate(75 65 48)" />
      </g>

      {/* Efeito de queijo puxando fios finos na ponta */}
      <path d="M57,105 Q60,111 60,115 Q60,111 63,105 Z" fill="#FFE082" />
    </g>
  </svg>
);

// 12. Pirulito (🍭)
export const PirulitoGiftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="popStick" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#F5F5F5" />
        <stop offset="100%" stopColor="#D6D6D6" />
      </linearGradient>
      {/* Gradientes espirais para as cores */}
      <radialGradient id="lollipopGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FF4081" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
      </radialGradient>
      <filter id="popShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#9C27B0" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* Brilho mágico de fundo do pirulito */}
    <circle cx="60" cy="46" r="44" fill="url(#lollipopGlow)" style={{ filter: 'blur(8px)' }} />

    {/* Bastão/Palito do pirulito */}
    <rect x="56" y="80" width="8" height="40" rx="4" fill="url(#popStick)" />
    <path d="M56,80 L64,80 L64,83 L56,83 Z" fill="#E0E0E0" />

    {/* Disco Espiral Candy 3D */}
    <g filter="url(#popShadow)">
      <circle cx="60" cy="46" r="36" fill="#FFF" />
      
      {/* Clássico Espiral Candy espiralado colorido */}
      {/* Fatia Rosa/Vermelha */}
      <path d="M60,46 L60,10 A36,36 0 0,1 91,28 Z" fill="#FF1744" />
      {/* Fatia Laranja */}
      <path d="M60,46 L91,28 A36,36 0 0,1 96,46 Z" fill="#FF9100" />
      {/* Fatia Amarela */}
      <path d="M60,46 L96,46 A36,36 0 0,1 78,75 Z" fill="#FFD600" />
      {/* Fatia Verde Limão */}
      <path d="M60,46 L78,75 A36,36 0 0,1 60,82 Z" fill="#00E676" />
      {/* Fatia Azul Ciano */}
      <path d="M60,46 L60,82 A36,36 0 0,1 29,64 Z" fill="#00E5FF" />
      {/* Fatia Roxo Astral */}
      <path d="M60,46 L29,64 A36,36 0 0,1 24,46 Z" fill="#D500F9" />
      {/* Fatia Pink Violeta */}
      <path d="M60,46 L24,46 A36,36 0 0,1 60,10 Z" fill="#E040FB" />

      {/* Redemoinho de Relevo Branco em Voltas */}
      <path d="M60,46 Q70,30 65,18 Q55,24 60,46" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M60,46 Q78,50 82,34 Q70,36 60,46" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M60,46 Q45,62 39,50 Q50,46 60,46" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />

      {/* Capa de plástico cristalina (brilho) por cima */}
      <path d="M30,26 A36,36 0 0,1 86,22" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" opacity="0.6" />
      <circle cx="48" cy="30" r="3" fill="#FFFFFF" opacity="0.7" />
    </g>
  </svg>
);

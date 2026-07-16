import React, { useState, useEffect } from "react";
import { BackIcon } from "./icons";
import { useTranslation } from "../i18n";
import { User, LevelInfo } from "../types";
import { api } from "../services/api";
import { LoadingSpinner } from "./Loading";

// Adicionar animações CSS personalizadas para partículas e brilhos
const style = document.createElement("style");
style.textContent = `
  @keyframes spark {
    0%, 100% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 1; transform: scale(1); }
  }
  @keyframes shine {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
`;
document.head.appendChild(style);

interface MyLevelScreenProps {
  onClose: () => void;
  currentUser: User;
}

const GoldenHexagon = ({ level }: { level: number }) => (
  <div className="relative w-[150px] h-[170px] flex items-center justify-center -ml-4">
    {/* Inner and Outer Glow */}
    <div className="absolute inset-0 bg-[#ffaa00] rounded-full blur-[40px] opacity-30 animate-pulse"></div>
    {/* Concentric SVG */}
    <svg
      viewBox="0 0 100 115"
      className="absolute w-full h-full drop-shadow-[0_0_15px_rgba(255,165,0,0.8)]"
    >
      <defs>
        <radialGradient id="gold" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#fff8c4" />
          <stop offset="30%" stopColor="#ffb347" />
          <stop offset="70%" stopColor="#c27c00" />
          <stop offset="100%" stopColor="#593a00" />
        </radialGradient>
        <linearGradient id="gold-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe699" />
          <stop offset="50%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#bd9b16" />
        </linearGradient>
        <radialGradient id="dark-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3d2600" />
          <stop offset="100%" stopColor="#1a1100" />
        </radialGradient>
      </defs>
      {/* Outer base */}
      <polygon
        points="50,2 96,28 96,87 50,113 4,87 4,28"
        fill="url(#gold)"
        stroke="url(#gold-border)"
        strokeWidth="1.5"
      />
      {/* Inner mechanism */}
      <polygon
        points="50,10 88,32 88,83 50,105 12,83 12,32"
        fill="url(#dark-center)"
        stroke="url(#gold-border)"
        strokeWidth="2.5"
      />
      <polygon
        points="50,18 81,36 81,79 50,97 19,79 19,36"
        fill="transparent"
        stroke="#ffcc00"
        strokeWidth="1"
        opacity="0.5"
        strokeDasharray="2 2"
      />
      <circle cx="50" cy="57.5" r="32" fill="url(#gold)" opacity="0.15" />
      <circle
        cx="50"
        cy="57.5"
        r="28"
        fill="transparent"
        stroke="url(#gold-border)"
        strokeWidth="1.5"
      />
      <polygon
        points="50,34 70,46 70,69 50,81 30,69 30,46"
        fill="url(#gold)"
        stroke="#ffd700"
        strokeWidth="1"
      />
      <circle
        cx="50"
        cy="57.5"
        r="21"
        fill="#140c00"
        stroke="#a37800"
        strokeWidth="1"
      />
    </svg>
    <span
      className="relative z-10 text-[42px] font-black text-[#fffdf0] pt-2"
      style={{
        WebkitTextStroke: "1.5px #cc9900",
        textShadow: "0 2px 5px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.8)",
      }}
    >
      {level}
    </span>
  </div>
);

const GlassHexagon = ({ level }: { level: number }) => (
  <div className="relative w-[75px] h-[85px] flex items-center justify-center">
    <svg
      viewBox="0 0 100 115"
      className="absolute w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
    >
      <defs>
        <linearGradient id="glass-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="glass-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points="50,2 96,28 96,87 50,113 4,87 4,28"
        fill="url(#glass-fill)"
        stroke="url(#glass-border)"
        strokeWidth="2.5"
      />
      <polygon
        points="50,12 87,33 87,82 50,103 13,82 13,33"
        fill="transparent"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />
    </svg>
    <span
      className="relative z-10 text-[32px] font-bold text-[#bbedff] pt-1"
      style={{ textShadow: "0 0 12px rgba(138,224,255,0.8)" }}
    >
      {level}
    </span>
  </div>
);

const MyLevelScreen: React.FC<MyLevelScreenProps> = ({
  onClose,
  currentUser,
}) => {
  const { t } = useTranslation();
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setIsLoading(true);
      api.level
        .getLevelInfo(currentUser.id)
        .then((response) => {
          setLevelInfo({
            level: response.level,
            xp: response.currentExp,
            xpForNextLevel: response.expForNextLevel,
            xpForCurrentLevel: 0,
            progress: response.progress,
            privileges: [],
            nextRewards: [],
            totalExp: response.totalExp,
            rank: Number(response.rank) || 0,
            lastGain: response.lastGain,
          });
        })
        .catch((err) => console.error("Failed to load level info:", err))
        .finally(() => setIsLoading(false));
    }
  }, [currentUser]);

  if (isLoading || !levelInfo) {
    return (
      <div className="absolute inset-0 bg-[#0a0a0c] z-50 flex flex-col text-white">
        <header className="flex items-center p-4 flex-shrink-0">
          <button onClick={onClose} className="absolute z-10 p-2">
            <BackIcon className="w-5 h-5 text-gray-300" />
          </button>
          <div className="flex-grow text-center">
            <h1 className="text-[17px] font-semibold text-white">Meu Nível</h1>
          </div>
        </header>
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const { level, xp, xpForNextLevel, progress } = levelInfo;
  const safeLevel = level || 1;
  const safeXp = xp || 0;
  const safeXpForNextLevel = xpForNextLevel || 100;
  const safeProgress = progress || 0;

  return (
    <div className="absolute inset-0 bg-[#060608] z-50 flex flex-col text-white font-sans overflow-hidden">
      {/* Background Star Particles */}
      <div
        className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full opacity-50 shadow-[0_0_10px_rgba(255,255,255,1)]"
        style={{ animation: "spark 3s infinite 0.5s" }}
      ></div>
      <div
        className="absolute top-1/3 right-1/4 w-[2px] h-[2px] bg-[#fff] rounded-full opacity-70 shadow-[0_0_8px_rgba(255,255,255,1)]"
        style={{ animation: "spark 2s infinite 1.2s" }}
      ></div>
      <div
        className="absolute top-1/2 left-1/3 w-1 h-1 bg-[#ffaa00] rounded-full opacity-60 shadow-[0_0_12px_rgba(255,170,0,1)]"
        style={{ animation: "spark 4s infinite 0.1s" }}
      ></div>
      <div
        className="absolute bottom-1/3 right-1/3 w-1.5 h-1.5 bg-[#00ffff] rounded-full opacity-40 shadow-[0_0_10px_rgba(0,255,255,1)]"
        style={{ animation: "spark 3.5s infinite 2s" }}
      ></div>

      {/* Large Gold Core Glow */}
      <div className="absolute top-[30%] left-[35%] -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(255,160,0,0.12)_0%,transparent_70%)] pointer-events-none blur-2xl"></div>

      <header className="flex items-center p-4 flex-shrink-0 relative z-20">
        <button onClick={onClose} className="absolute z-10 p-2">
          <BackIcon className="w-5 h-5 text-gray-300" />
        </button>
        <div className="flex-grow text-center">
          <h1 className="text-[17px] font-semibold text-white tracking-wide">
            Meu Nível
          </h1>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 -mt-10">
        {/* Hexagons row */}
        <div className="flex items-center justify-center space-x-6 relative">
          {/* Subtle light streak behind hexagons */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ffcc0040] to-transparent -translate-y-1/2 rotate-[-15deg] w-[150%] -ml-[25%] blur-[2px]"></div>

          <GoldenHexagon level={safeLevel} />

          <div className="flex items-center space-x-3 -ml-2">
            <GlassHexagon level={safeLevel + 1} />
            <GlassHexagon level={safeLevel + 2} />
          </div>
        </div>

        {/* Nível Atual Text Container */}
        <div className="flex flex-col items-center mt-12 mb-6">
          <h2
            className="text-[#e8e8eb] text-[22px] font-serif mb-2 tracking-wide font-medium"
            style={{ textShadow: "0 2px 5px rgba(0,0,0,0.5)" }}
          >
            Nível Atual
          </h2>
          <div
            className="text-[64px] font-black leading-none drop-shadow-[0_0_15px_rgba(200,50,255,0.6)]"
            style={{
              WebkitTextStroke: "2px #dc2626",
              WebkitTextFillColor: "transparent",
              background: "linear-gradient(to bottom, #ec4899, #a855f7)",
              WebkitBackgroundClip: "text",
              filter:
                "drop-shadow(0 0 10px rgba(168, 85, 247, 0.5)) drop-shadow(0 0 30px rgba(236, 72, 153, 0.4))",
            }}
          >
            {safeLevel}
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full max-w-[340px] flex flex-col items-center mt-4">
          <div className="relative w-full h-[22px] bg-[#1a1a2e] border border-[#2f2f45] rounded-full px-1.5 flex items-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
            {/* Tube End Caps */}
            <div className="absolute left-[-2px] w-[14px] h-[28px] bg-gradient-to-r from-[#9ca3af] via-[#e5e7eb] to-[#6b7280] z-20 rounded-l-full shadow-[0_0_5px_rgba(0,0,0,0.5)] border border-[#4b5563]"></div>
            <div className="absolute left-[8px] w-[2px] h-[22px] bg-[#374151] z-30"></div>{" "}
            {/* Divot */}
            <div className="absolute right-[-2px] w-[14px] h-[28px] bg-gradient-to-l from-[#9ca3af] via-[#e5e7eb] to-[#6b7280] z-20 rounded-r-full shadow-[0_0_5px_rgba(0,0,0,0.5)] border border-[#4b5563]"></div>
            <div className="absolute right-[8px] w-[2px] h-[22px] bg-[#374151] z-30"></div>{" "}
            {/* Divot */}
            {/* Inner Bar Track */}
            <div className="relative h-[8px] w-full mx-2.5 rounded-full bg-[#0a0a14] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00ffff] to-[#9333ea] rounded-full shadow-[0_0_12px_rgba(0,255,255,0.7)] transition-all duration-700 ease-out"
                style={{ width: `${Math.max(5, safeProgress)}%` }} // Give at least 5% so the glow is visible
              >
                {/* Glowing Core Wave Effect */}
                <div
                  className="absolute inset-0 opacity-60 mix-blend-screen"
                  style={{
                    backgroundImage:
                      "radial-gradient(ellipse at center, rgba(255,255,255,0.8) 0%, transparent 60%)",
                    backgroundSize: "30px 100%",
                    animation: "shine 2s linear infinite",
                  }}
                ></div>
                {/* Glow Point at trailing edge */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[6px] h-[6px] bg-white rounded-full shadow-[0_0_10px_#fff,0_0_20px_#0ff]"></div>
              </div>
            </div>
          </div>

          <div className="text-center text-[#8e8e93] text-[12px] font-semibold tracking-wider mt-3">
            {safeXp.toLocaleString()}/{safeXpForNextLevel.toLocaleString()} EXP
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyLevelScreen;

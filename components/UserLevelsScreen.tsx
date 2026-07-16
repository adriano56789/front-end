import React, { useState, useEffect } from 'react';
import { BackIcon } from './icons';
import { useTranslation } from '../i18n';
import { User, LevelInfo } from '../types';
import { api } from '../services/api';
import { LoadingSpinner } from './Loading';

// Level Badge with Exact Neon Glow CSS matching the system screenshot
export const PremiumLevelBadge: React.FC<{ level: number; className?: string }> = ({ level, className = '' }) => {
  // Determine level range styles
  let badgeStyle = {};
  let textStyle = {};
  let text = `Lvl. ${level}`;

  if (level >= 41) {
    // Diamond Icy Frost (Levels 41-50): Icy white-blue glowing neon style with shining white/blue sparkles/aura
    badgeStyle = {
      background: 'linear-gradient(135deg, #e0f2fe 0%, #38bdf8 45%, #0369a1 100%)',
      border: '1.5px solid #ffffff',
      boxShadow: '0 0 15px rgba(14, 165, 233, 0.85), 0 0 5px rgba(255, 255, 255, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.4)',
    };
    textStyle = {
      color: '#ffffff',
      textShadow: '0 1px 3px rgba(3, 105, 161, 0.9), 0 0 8px rgba(255, 255, 255, 0.8)',
    };
  } else if (level >= 31) {
    // Purple Nebula Neon (Levels 31-40): Purple violet, neon style with strong purple aura
    badgeStyle = {
      background: 'linear-gradient(135deg, #f5f3ff 0%, #c084fc 45%, #6b21a8 100%)',
      border: '1.5px solid #d8b4fe',
      boxShadow: '0 0 15px rgba(168, 85, 247, 0.9), 0 0 4px rgba(168, 85, 247, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
    };
    textStyle = {
      color: '#ffffff',
      textShadow: '0 1px 3px rgba(88, 28, 135, 0.9), 0 0 8px rgba(192, 132, 252, 0.8)',
    };
  } else if (level >= 21) {
    // Gold Aura (Levels 21-30): Gold style with glow and sparkles
    badgeStyle = {
      background: 'linear-gradient(135deg, #fffbeb 0%, #ca8a04 45%, #713f12 100%)',
      border: '1.5px solid #fef08a',
      boxShadow: '0 0 15px rgba(234, 179, 8, 0.95), 0 0 4px rgba(234, 179, 8, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
    };
    textStyle = {
      color: '#ffffff',
      textShadow: '0 1px 3px rgba(113, 63, 18, 0.9), 0 0 8px rgba(253, 224, 71, 0.8)',
    };
  } else if (level >= 11) {
    // Bronze Metallic (Levels 11-20): Bronze metallic style with warm amber neon glow
    badgeStyle = {
      background: 'linear-gradient(135deg, #fff7ed 0%, #b45309 45%, #7c2d12 100%)',
      border: '1.5px solid #fed7aa',
      boxShadow: '0 0 12px rgba(194, 65, 12, 0.75), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
    };
    textStyle = {
      color: '#ffffff',
      textShadow: '0 1px 2px rgba(124, 45, 18, 0.8), 0 0 5px rgba(251, 146, 60, 0.6)',
    };
  } else {
    // Silver / Platina Metal (Levels 1-10): Chrome metallic silver style
    badgeStyle = {
      background: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 45%, #475569 100%)',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 0 10px rgba(148, 163, 184, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
    };
    textStyle = {
      color: '#ffffff',
      textShadow: '0 1px 2px rgba(30, 41, 59, 0.8)',
    };
  }

  return (
    <div
      style={badgeStyle}
      className={`relative inline-flex items-center justify-center px-4 py-1.5 rounded-full min-w-[76px] h-[28px] overflow-hidden select-none shadow-md ${className}`}
    >
      {/* Gloss reflection shine overlay */}
      <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20 rounded-t-full pointer-events-none" />
      
      <span
        style={textStyle}
        className="text-[12px] font-black tracking-wider leading-none select-none font-sans"
      >
        {text}
      </span>

      {/* Twinkly glow points of levels above 21 */}
      {level >= 21 && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white blur-[1.5px] opacity-85 animate-pulse" />
      )}
    </div>
  );
};

interface UserLevelsScreenProps {
  onClose: () => void;
  currentUser: User;
}

const UserLevelsScreen: React.FC<UserLevelsScreenProps> = ({ onClose, currentUser }) => {
  const { t } = useTranslation();
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'silver' | 'bronze' | 'gold' | 'purple' | 'diamond'>('all');
  const [selectedLevelInfo, setSelectedLevelInfo] = useState<{ level: number; perk: string; expRequired: number } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setLoading(true);
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
        .catch((err) => console.error('Falha ao buscar progresso do nível:', err))
        .finally(() => setLoading(false));
    }
  }, [currentUser]);

  // Benefit perks for range
  const getPerksForLevel = (lvl: number) => {
    if (lvl >= 41) return 'Auréola do Infinito Diamond: entrada em salas com notificação estroboscópica, badge de diamante brilhante, borda de comentário de diamante de luxo e suporte super VIP prioritário.';
    if (lvl >= 31) return 'Aura de Estrela Violeta: entrada VIP na sala, badge de néon roxo brilhante, borda de comentário com efeito néon e presente exclusivo mensal.';
    if (lvl >= 21) return 'Brilho de Ouro Divino: moldura de avatar dourada reluzente, efeito de entrada de fumaça dourada, status de chat destacado e badge dourado premium.';
    if (lvl >= 11) return 'Fronteiras de Bronze: badge animado de bronze, permissão para enviar mais tipos de presentes, efeito de entrada estático e status preferencial.';
    return 'Insígnia de Platina/Prata básica: entrada simples na sala de chat e badge prata premium padrão.';
  };

  // Safe variables
  const currentLvl = levelInfo?.level || currentUser.level || 1;
  const currentXp = levelInfo?.xp || 0;
  const nextXp = levelInfo?.xpForNextLevel || 100;
  const progressPercent = levelInfo?.progress || 0;

  // Levels list from 1 to 50
  const allLevels = Array.from({ length: 50 }, (_, i) => i + 1);

  // Filter levels based on active tab
  const filteredLevels = allLevels.filter((lvl) => {
    if (activeCategory === 'silver') return lvl >= 1 && lvl <= 10;
    if (activeCategory === 'bronze') return lvl >= 11 && lvl <= 20;
    if (activeCategory === 'gold') return lvl >= 21 && lvl <= 30;
    if (activeCategory === 'purple') return lvl >= 31 && lvl <= 40;
    if (activeCategory === 'diamond') return lvl >= 41 && lvl <= 50;
    return true;
  });

  return (
    <div className="absolute inset-0 bg-[#060608] z-50 flex flex-col text-white font-sans overflow-y-auto pb-6">
      {/* Background Neon Spotlights */}
      <div className="absolute top-[10%] left-[5%] right-[5%] h-[200px] bg-gradient-to-b from-purple-900/10 via-transparent to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[300px] h-[300px] bg-sky-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 bg-[#060608]/90 backdrop-blur-md flex items-center p-4 border-b border-white/[0.05] z-50">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-95 transition-all">
          <BackIcon className="w-5 h-5 text-gray-300" />
        </button>
        <div className="flex-grow text-center">
          <h1 className="text-[17px] font-bold text-white tracking-wide">Galeria de Níveis</h1>
        </div>
        <div className="w-9" /> {/* Spacer */}
      </header>

      {/* Main Status */}
      <div className="p-6 flex flex-col items-center bg-gradient-to-b from-white/[0.02] to-transparent border-b border-white/[0.03] relative">
        <p className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-3">Seu Nível Atual</p>
        
        {/* Animated Badge */}
        <div className="mb-4 transform scale-110 hover:scale-115 transition-transform duration-300 cursor-pointer">
          <PremiumLevelBadge level={currentLvl} className="shadow-[0_0_25px_rgba(168,85,247,0.35)]" />
        </div>

        <p className="text-sm text-gray-300 text-center font-medium max-w-[280px]">
          Você está no <span className="text-purple-400 font-bold">Nível {currentLvl}</span>. Ganhe mais EXP comentando nas transmissões ou enviando presentes!
        </p>

        {/* Progress Bar Container */}
        <div className="w-full max-w-[320px] flex flex-col items-center mt-6">
          <div className="relative w-full h-[18px] bg-gray-950/65 border border-white/5 rounded-full px-1.5 flex items-center shadow-inner">
            <div className="h-[6px] w-full rounded-full bg-black/40 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-sky-400 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.6)] transition-all duration-700 ease-out"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              >
                <div
                  className="absolute inset-0 opacity-40 mix-blend-screen"
                  style={{
                    backgroundImage: 'radial-gradient(ellipse at center, rgba(255,255,255,0.8) 0%, transparent 60%)',
                    backgroundSize: '25px 100%',
                  }}
                />
              </div>
            </div>
          </div>
          <p className="text-[#8e8e93] text-[11px] font-bold tracking-wider mt-2.5">
            {currentXp.toLocaleString()} / {nextXp.toLocaleString()} EXP ({progressPercent}%)
          </p>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="px-4 py-2 flex items-center gap-1 overflow-x-auto scrollbar-none sticky top-[53px] bg-[#060608]/95 backdrop-blur-md border-b border-white/[0.05] z-40">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
            activeCategory === 'all' ? 'bg-purple-600/90 text-white shadow-md' : 'text-gray-400 hover:text-white bg-white/5'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setActiveCategory('silver')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
            activeCategory === 'silver' ? 'bg-slate-600 text-white shadow-md' : 'text-gray-400 hover:text-white bg-white/5'
          }`}
        >
          1 - 10
        </button>
        <button
          onClick={() => setActiveCategory('bronze')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
            activeCategory === 'bronze' ? 'bg-orange-800 text-white shadow-md' : 'text-gray-400 hover:text-white bg-white/5'
          }`}
        >
          11 - 20
        </button>
        <button
          onClick={() => setActiveCategory('gold')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
            activeCategory === 'gold' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white bg-white/5'
          }`}
        >
          21 - 30
        </button>
        <button
          onClick={() => setActiveCategory('purple')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
            activeCategory === 'purple' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white bg-white/5'
          }`}
        >
          31 - 40
        </button>
        <button
          onClick={() => setActiveCategory('diamond')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
            activeCategory === 'diamond' ? 'bg-sky-500 text-black shadow-md' : 'text-gray-400 hover:text-white bg-white/5'
          }`}
        >
          41 - 50
        </button>
      </div>

      {/* Levels list with Glow/Aura Categories description */}
      <div className="px-4 mt-4">
        {activeCategory === 'all' && (
          <div className="mb-4 bg-purple-950/20 border border-purple-500/20 rounded-xl p-3.5 text-xs text-purple-200">
            <h3 className="font-bold text-white mb-1.5 flex items-center gap-1.5">
              <span>💫 Sistema de Patentes e Aura de Nível</span>
            </h3>
            Seu nível no LiveGo possui brilho néon e aura exclusiva que muda conforme você evolui. Toque em qualquer insígnia abaixo para ver seus privilégios!
          </div>
        )}

        {/* Level Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-y-5 gap-x-3 justify-items-center mt-2.5">
          {filteredLevels.map((lvl) => {
            const isClickable = true;
            return (
              <button
                key={lvl}
                onClick={() => {
                  setSelectedLevelInfo({
                    level: lvl,
                    perk: getPerksForLevel(lvl),
                    expRequired: lvl * 1000 - 500,
                  });
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all hover:bg-white/5 active:scale-95 cursor-pointer relative ${
                  lvl === currentLvl ? 'bg-purple-900/15 border border-purple-500/30' : ''
                }`}
              >
                {lvl === currentLvl && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-purple-500 text-[8px] font-extrabold text-white px-1 py-0.2 rounded uppercase tracking-wider z-10 animate-bounce">
                    Você
                  </span>
                )}
                <PremiumLevelBadge level={lvl} className="transform scale-90" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed perk description dialog modal */}
      {selectedLevelInfo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setSelectedLevelInfo(null)}>
          <div className="bg-[#111116] border border-white/[0.08] p-5 rounded-2xl w-full max-w-[320px] shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-3">
              <PremiumLevelBadge level={selectedLevelInfo.level} className="transform scale-110 mb-1" />
              <h3 className="text-white font-bold text-lg">Nível {selectedLevelInfo.level}</h3>
              <div className="w-full h-[1px] bg-white/[0.05] my-1" />
              <div className="text-gray-300 text-xs leading-relaxed text-center py-1">
                <span className="font-bold text-purple-400 block mb-1">Recompensa & Privilégios:</span>
                {selectedLevelInfo.perk}
              </div>
              <div className="w-full h-[1px] bg-white/[0.05] my-1" />
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                EXP ESTIMADA: {selectedLevelInfo.expRequired.toLocaleString()}
              </p>
              <button
                onClick={() => setSelectedLevelInfo(null)}
                className="w-full bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all text-white text-xs font-bold py-2.5 rounded-xl mt-2 border-none cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserLevelsScreen;

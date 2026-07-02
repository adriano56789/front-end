import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { BackIcon, SearchIcon, PlusIcon } from './icons';
import { useTranslation } from '../i18n';
import { api } from '../services/api';

interface SearchScreenProps {
  onClose: () => void;
  onViewProfile: (user: User) => void;
  allUsers: User[];
  onFollowUser: (user: User) => void;
}

const UserItem: React.FC<{ user: User; onViewProfile: (user: User) => void; onFollow: (user: User) => void; }> = ({ user, onViewProfile, onFollow }) => {
    const { t } = useTranslation();

    const handleFollow = (e: React.MouseEvent) => {
        e.stopPropagation();
        onFollow(user);
    };

    return (
        <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 cursor-pointer" onClick={() => onViewProfile(user)}>
            <div className="flex items-center space-x-4 min-w-0">
                <img 
                    src={user.avatarUrl} 
                    alt={user.name} 
                    className="w-14 h-14 rounded-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><rect width="56" height="56" fill="#333"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="24">?</text></svg>');
                    }}
                />
                <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-white truncate">{user.name}</h3>
                        {user.isFriend && (
                            <span className="text-green-400 text-sm flex-shrink-0">👥</span>
                        )}
                    </div>
                    <p className="text-sm text-gray-400">{t('profile.id')}: {user.name}</p>
                </div>
            </div>
            <button
                onClick={handleFollow}
                className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-all duration-200 flex items-center space-x-1 shrink-0 ${
                    user.isFollowed
                        ? 'bg-green-600 text-white hover:bg-green-700 scale-95 shadow-inner'
                        : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 shadow-md'
                }`}
            >
                {!user.isFollowed && <PlusIcon className="w-4 h-4" />}
                <span>{user.isFollowed ? t('common.following') : t('common.follow')}</span>
            </button>
        </div>
    );
};


const MagnifyingGlassIllustration: React.FC = () => {
    return (
        <svg width="240" height="240" viewBox="0 0 240 240" fill="none" className="animate-pulse duration-[4000ms]">
            <defs>
                <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#EC4899" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="lensReflect" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                    <stop offset="30%" stopColor="#ffffff" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <filter id="neonGlowBlur" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            
            {/* Background ambient glow dots */}
            <circle cx="120" cy="110" r="85" fill="url(#purpleGlow)" opacity="0.2" filter="blur(25px)" />

            {/* Glowing decorative light lines passing through magnifier */}
            <line x1="50" y1="160" x2="190" y2="70" stroke="#C084FC" strokeWidth="2.5" strokeDasharray="4 4" opacity="0.35" />
            <line x1="70" y1="50" x2="210" y2="180" stroke="#EC4899" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.25" />

            {/* Floating Glass/Neon Geometric Polyhedra & Particles */}
            {/* Cube (top left) */}
            <g transform="translate(45, 65) rotate(15)" opacity="0.85">
                <path d="M 0,-10 L 12,-16 L 24,-10 L 12,-4 Z" fill="#D8B4FE" fillOpacity="0.35" stroke="#D8B4FE" strokeWidth="1" />
                <path d="M 0,-10 L 0,4 L 12,10 L 12,-4 Z" fill="#A855F7" fillOpacity="0.4" stroke="#A855F7" strokeWidth="1" />
                <path d="M 24,-10 L 24,4 L 12,10 L 12,-4 Z" fill="#6366F1" fillOpacity="0.4" stroke="#6366F1" strokeWidth="1" />
            </g>

            {/* Glowing Pyramid / Tetra (top right) */}
            <g transform="translate(180, 80) rotate(-10)" opacity="0.8">
                <path d="M 12,-18 L 24,10 L 0,10 Z" fill="#F472B6" fillOpacity="0.35" stroke="#F472B6" strokeWidth="1" />
                <path d="M 12,-18 L 12,15 L 24,10 Z" fill="#EC4899" fillOpacity="0.3" stroke="#EC4899" strokeWidth="1" />
                <path d="M 12,-18 L 12,15 L 0,10 Z" fill="#F472B6" fillOpacity="0.45" stroke="#F472B6" strokeWidth="1" />
            </g>

            {/* Translucent diamond (bottom right) */}
            <g transform="translate(185, 155) rotate(20)" opacity="0.9">
                <path d="M 10,-12 L 19,-1 L 10,11 L 1,-1 Z" fill="#C084FC" fillOpacity="0.3" stroke="#C084FC" strokeWidth="1.2" />
                <path d="M 10,-12 L 10,11 L 19,-1 Z" fill="#A855F7" fillOpacity="0.35" stroke="#A855F7" strokeWidth="1" />
            </g>

            {/* Tiny stars/crosses of light */}
            <path d="M 145,35 L 145,43 M 141,39 L 149,39" stroke="#E9D5FF" strokeWidth="1.2" />
            <path d="M 75,175 L 75,181 M 72,178 L 78,178" stroke="#E9D5FF" strokeWidth="1" opacity="0.75" />

            {/* Futuristic glowing connection rods & handle (drawn first to remain underneath rim) */}
            <g filter="url(#neonGlowBlur)">
                {/* Thick purple neon outer glow */}
                <line x1="145" y1="135" x2="195" y2="185" stroke="url(#purpleGlow)" strokeWidth="12" strokeLinecap="round" />
                {/* Hot pink helper accent */}
                <line x1="150" y1="140" x2="190" y2="180" stroke="#EC4899" strokeWidth="8" strokeLinecap="round" opacity="0.6" />
                {/* Pure white glossy core highlight */}
                <line x1="152" y1="142" x2="188" y2="178" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.95" />
            </g>

            {/* Magnifying Glass Inner Rim / Main Ring */}
            {/* Ambient Shadow Ring */}
            <circle cx="110" cy="100" r="58" stroke="#000000" strokeWidth="6" opacity="0.4" />
            {/* Multi-layered neon glow */}
            <circle cx="110" cy="100" r="55" stroke="url(#purpleGlow)" strokeWidth="5" filter="url(#neonGlowBlur)" />
            {/* Specular White Metal Bezel Edge */}
            <circle cx="110" cy="100" r="53" stroke="#F3E8FF" strokeWidth="1.2" opacity="0.85" />

            {/* Dark glass lens base */}
            <circle cx="110" cy="100" r="51" fill="#1E132D" fillOpacity="0.6" />
            {/* Glowing center area */}
            <circle cx="110" cy="100" r="51" fill="url(#purpleGlow)" fillOpacity="0.15" />
            {/* Glossy Linear Reflection Overlay */}
            <circle cx="110" cy="100" r="51" fill="url(#lensReflect)" />

            {/* Glass Glare Wedge Accent */}
            <path d="M 72,72 A 51,51 0 0,1 148,128 Z" fill="#FFFFFF" fillOpacity="0.09" />
        </svg>
    );
};


const SearchScreen: React.FC<SearchScreenProps> = ({ onClose, onViewProfile, allUsers, onFollowUser }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const searchUsers = async () => {
            if (query.trim() === '') {
                setResults([]);
                setError(null);
                return;
            }

            setIsLoading(true);
            setError(null);
            
            try {
                const response = await api.searchUsers(query.trim(), 20);
                setResults(response.users || []);
            } catch (err) {
                setError('Não foi possível buscar usuários');
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        // Cancelar timeout anterior se existir
        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
        }
        
        // Criar novo timeout
        const newTimeoutId = setTimeout(searchUsers, 300);
        timeoutIdRef.current = newTimeoutId;
        
        // Cleanup
        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
        };
    }, [query]);

    return (
        <div className="absolute inset-0 bg-[#0A0A0C] z-50 flex flex-col text-white">
            <header className="flex items-center p-4 border-b border-gray-800/60 flex-shrink-0 space-x-4">
                <button onClick={onClose} className="flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
                    <BackIcon className="w-6 h-6" />
                </button>
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/80 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou usuário"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-[#191325]/45 text-white placeholder-gray-500 border border-purple-500/30 rounded-full py-2 pl-11 pr-4 focus:outline-none focus:border-purple-400/80 focus:ring-1 focus:ring-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.15)] transition-all duration-300 text-[14px] font-medium"
                        autoFocus
                    />
                </div>
            </header>
            <main className="flex-grow overflow-y-auto no-scrollbar">
                {isLoading && (
                    <div className="flex items-center justify-center h-full text-center text-gray-500 p-8">
                        <p>Buscando...</p>
                    </div>
                )}
                {error && (
                    <div className="flex items-center justify-center h-full text-center text-red-500 p-8">
                        <p>{error}</p>
                    </div>
                )}
                {!isLoading && !error && query && results.length > 0 && (
                    results.map(user => <UserItem key={user.id} user={user} onViewProfile={onViewProfile} onFollow={onFollowUser} />)
                )}
                {!isLoading && !error && query && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
                        <p>{t('search.noResults')}</p>
                        <p className="text-sm">{t('search.tryAgain')}</p>
                    </div>
                )}
                 {!query && !isLoading && !error && (
                    <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8 select-none">
                        <div className="mb-8 flex justify-center items-center">
                            <MagnifyingGlassIllustration />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-wide space-y-1.5 leading-relaxed">
                            <div className="text-white/90">Pesquise por</div>
                            <div className="text-white font-black text-2xl tracking-normal">streamers e amigos</div>
                        </h2>
                    </div>
                 )}
            </main>
        </div>
    );
};

export default SearchScreen;

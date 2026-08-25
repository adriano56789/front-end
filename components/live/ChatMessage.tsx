import React, { useState } from 'react';
import { PlusIcon, SettingsIcon, MaleIcon, FemaleIcon } from '../icons';
import { User } from '../../types';
import { useTranslation } from '../../i18n';
import { translateText } from '../../services/translate';

interface ChatMessageProps {
    userObject: User;
    message: string | React.ReactNode;
    onAvatarClick: () => void;
    onFollow?: () => void;
    isFollowed?: boolean;
    onModerationClick?: () => void;
    isModerator?: boolean;
    timestamp?: string | number;
    avatarUrl?: string;
}

const AgeBadge: React.FC<{ gender?: 'male' | 'female' | 'not_specified'; age?: number }> = ({ gender = 'female', age }) => {
    const isMale = gender === 'male';
    const displayAge = age && age > 0 ? age : 18;
    return (
        <span className={`inline-flex items-center text-white text-[6px] font-black px-0.5 rounded select-none shadow-[0_1px_1.5px_rgba(0,0,0,0.35)] h-[9px] shrink-0 font-sans ${isMale ? 'bg-[#3b82f6]' : 'bg-[#ec4899]'}`}>
            {isMale ? <MaleIcon className="h-1.5 w-1.5 text-white" /> : <FemaleIcon className="h-1.5 w-1.5 text-white" />}
            <span>{displayAge}</span>
        </span>
    );
};

const getUsernameColor = (username: string, level?: number) => {
    if (username === 'Sistema' || (level && level >= 4)) return '#fbbf24';
    const colors = [
        '#38bdf8',
        '#f472b6',
        '#34d399',
        '#c084fc',
        '#fb923c',
        '#22d3ee',
        '#ff7185',
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const TranslateButton: React.FC<{ active: boolean; loading: boolean; onClick: (e: React.MouseEvent) => void }> = ({ active, loading, onClick }) => (
    <button
        onClick={onClick}
        className={`inline-flex items-center justify-center w-[15px] h-[15px] rounded-full border-2 leading-none shrink-0 select-none cursor-pointer transition-all text-[8px] font-black shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${active
            ? 'bg-[#a855f7]/40 border-[#a855f7] text-white'
            : 'bg-[#a855f7]/25 border-[#a855f7]/60 text-[#e9d5ff] hover:bg-[#a855f7]/45 hover:border-[#a855f7]'}`}
        aria-label="Traduzir mensagem"
        title={active ? 'Traduzido' : 'Traduzir'}
    >
        {loading ? '…' : 'A'}
    </button>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ userObject, message, onAvatarClick, onFollow, isFollowed, onModerationClick, isModerator, avatarUrl }) => {
    const { language } = useTranslation();
    const { name: user, level } = userObject;

    const isSystemMessage = user === 'Sistema';

    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [translating, setTranslating] = useState(false);
    const [showTranslated, setShowTranslated] = useState(false);

    const messageStr = typeof message === 'string' ? message : '';
    const canTranslate = !isSystemMessage && messageStr.trim().length > 0;
    const displayedMessage = showTranslated && translatedText ? translatedText : messageStr;

    const handleTranslate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showTranslated) { setShowTranslated(false); return; }
        if (translatedText) { setShowTranslated(true); return; }
        if (!messageStr.trim()) return;
        setTranslating(true);
        const result = await translateText(messageStr, language);
        setTranslating(false);
        if (result) { setTranslatedText(result); setShowTranslated(true); }
    };

    const isPurpleSystem = isSystemMessage && (
        (typeof message === 'string' && (
            message.includes('enviou') ||
            message.includes('moedas') ||
            message.includes('moeda') ||
            message.includes('presente') ||
            message.includes('Sent a') ||
            message.includes('Enviou')
        )) ||
        (React.isValidElement(message))
    );

    const nameColor = getUsernameColor(user, level);

    if (isSystemMessage) {
        if (isPurpleSystem) {
            return (
                <div
                    onClick={onAvatarClick}
                    className="text-[8px] bg-purple-950/40 backdrop-blur-md border border-purple-500/40 rounded-[10px] px-1.5 py-0.5 my-0.5 max-w-[70%] self-start animate-chat-message cursor-pointer select-none shadow-[0_0_12px_rgba(168,85,247,0.25)] hover:bg-purple-900/50 transition-all duration-200 break-words leading-tight"
                >
                    <span className="font-extrabold text-[#c084fc] font-sans tracking-wide text-[8px] shrink-0">Sistema:</span>{' '}
                    <span className="text-purple-100 font-sans font-semibold tracking-wide text-[8px] break-words">{message}</span>
                </div>
            );
        } else {
            return (
                <div
                    onClick={onAvatarClick}
                    className="text-[8px] bg-amber-950/40 backdrop-blur-md border border-amber-500/40 rounded-[10px] px-1.5 py-0.5 my-0.5 max-w-[70%] self-start animate-chat-message cursor-pointer select-none shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-900/50 transition-all duration-200 break-words leading-tight"
                >
                    <span className="font-extrabold text-[#fbbf24] font-sans tracking-wide text-[8px] shrink-0">Sistema:</span>{' '}
                    <span className="text-amber-100 font-sans font-semibold tracking-wide text-[8px] break-words">{message}</span>
                </div>
            );
        }
    }

    return (
        <div
            onClick={onAvatarClick}
            className="text-[8px] bg-black/20 backdrop-blur-sm border border-white/5 rounded-[10px] px-1.5 py-0.5 my-0.5 max-w-[70%] self-start select-none cursor-pointer transition-all duration-200 hover:bg-black/30 active:scale-[0.98] animate-chat-message break-words leading-tight"
        >
            {(avatarUrl || userObject.avatarUrl) && (
                <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 bg-black/30 border border-white/15 align-middle inline-block mr-0.5">
                    <img
                        src={avatarUrl || userObject.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user)}&background=random&color=fff&bold=true&font-size=0.4`}
                        alt={user}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user)}&background=random&color=fff&bold=true&font-size=0.4`; }}
                    />
                </div>
            )}
            {canTranslate && (
                <TranslateButton active={showTranslated && !!translatedText} loading={translating} onClick={handleTranslate} />
            )}

            <span
                className="font-extrabold tracking-wide shrink-0 font-sans text-[8px] pr-0.5"
                style={{ color: nameColor, textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {user}:
            </span>

            {isModerator && (
                <span className="inline-flex items-center bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white border border-blue-400/30 text-[6px] font-black px-0.5 rounded shadow-[0_0_8px_rgba(59,130,246,0.6)] tracking-wider uppercase font-sans h-[9px] leading-none shrink-0 scale-[0.95]">
                    Adm
                </span>
            )}

            <span className="inline-flex items-center bg-gradient-to-b from-zinc-200 via-white to-zinc-450 text-zinc-900 border border-zinc-200 text-[6px] font-black px-0.5 rounded-full shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),_0_1px_2px_rgba(0,0,0,0.2)] tracking-wide shrink-0 font-sans h-[9px]">
                Lvl. {level || 1}
            </span>

            <AgeBadge gender={userObject.gender} age={userObject.age} />

            <span
                className="text-white font-sans font-semibold break-words tracking-wide text-[8px]"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {showTranslated && translatedText ? (
                    <span className="italic opacity-90">{displayedMessage}</span>
                ) : (
                    displayedMessage
                )}
            </span>

            {onModerationClick && (
                <button
                    onClick={(e) => { e.stopPropagation(); onModerationClick(); }}
                    className="inline-flex items-center text-white/40 hover:text-white rounded-full w-3 h-3 justify-center hover:bg-white/5 transition-colors cursor-pointer shrink-0 align-middle"
                    aria-label={`Moderar ${user}`}
                >
                    <SettingsIcon className="w-2 h-2" />
                </button>
            )}

            {onFollow && !isFollowed && !onModerationClick && (
                <button
                    onClick={(e) => { e.stopPropagation(); onFollow(); }}
                    className="inline-flex items-center bg-gradient-to-br from-[#bd00ff] to-[#ecb2ff] text-white rounded-full w-3 h-3 justify-center text-xs hover:opacity-90 transition-all cursor-pointer shadow-[0_0_6px_rgba(189,0,255,0.15)] shrink-0 align-middle"
                    aria-label={`Seguir ${user}`}
                >
                    <PlusIcon className="w-1.5 h-1.5" />
                </button>
            )}
        </div>
    );
};

export default ChatMessage;

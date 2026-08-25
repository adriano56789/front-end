import React, { useState } from 'react';
import { User } from '../../types';
import { PlusIcon, MaleIcon, FemaleIcon } from '../icons';
import { useTranslation } from '../../i18n';
import { translateText } from '../../services/translate';

interface EntryChatMessageProps {
    user: User;
    currentUser: User;
    onClick: (user: User) => void;
    onFollow: (user: User) => void;
    isFollowed: boolean;
    isBroadcaster?: boolean;
    isModerator?: boolean;
    timestamp?: string | number;
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

const EntryChatMessage: React.FC<EntryChatMessageProps> = ({ user, currentUser, onClick, onFollow, isFollowed, isBroadcaster, isModerator }) => {
    const { t, language } = useTranslation();
    const isSelf = String(user.id) === String(currentUser.id);
    const showFollowButton = !isSelf && !isBroadcaster && !isFollowed;

    const entryText = t('streamRoom.enteredRoom');
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [translating, setTranslating] = useState(false);
    const [showTranslated, setShowTranslated] = useState(false);
    const displayedText = showTranslated && translatedText ? translatedText : entryText;

    const handleTranslate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showTranslated) { setShowTranslated(false); return; }
        if (translatedText) { setShowTranslated(true); return; }
        if (!entryText.trim()) return;
        setTranslating(true);
        const result = await translateText(entryText, language);
        setTranslating(false);
        if (result) { setTranslatedText(result); setShowTranslated(true); }
    };

    return (
        <div
            onClick={() => onClick(user)}
            className="text-[8px] bg-black/20 backdrop-blur-sm border border-white/5 rounded-[10px] px-1.5 py-0.5 my-0.5 max-w-[70%] self-start select-none cursor-pointer transition-all duration-200 hover:bg-black/30 active:scale-[0.98] animate-chat-message break-words leading-tight"
            data-purpose="system-notification"
        >
            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 bg-black/30 border border-white/15 align-middle inline-block mr-0.5">
                <img
                    src={user.avatarUrl || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true&font-size=0.4`}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&bold=true&font-size=0.4`; }}
                />
            </div>

            <TranslateButton active={showTranslated && !!translatedText} loading={translating} onClick={handleTranslate} />

            <span
                className="text-[#fbbf24] font-extrabold tracking-wide font-sans text-[8px] shrink-0 max-w-[45%] truncate align-middle"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {user.name}
            </span>

            <span className="inline-flex items-center bg-gradient-to-b from-zinc-200 via-white to-zinc-450 text-zinc-900 border border-zinc-200 text-[6px] font-black px-0.5 rounded-full shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),_0_1px_2px_rgba(0,0,0,0.2)] tracking-wide shrink-0 font-sans h-[9px] align-middle">
                Lvl. {user.level || 1}
            </span>

            <AgeBadge gender={user.gender} age={user.age} />

            {isModerator && (
                <span className="inline-flex items-center bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white border border-blue-400/30 text-[6px] font-black px-0.5 rounded shadow-[0_0_8px_rgba(59,130,246,0.6)] tracking-wider uppercase font-sans h-[9px] leading-none shrink-0 scale-[0.95] align-middle">
                    Adm
                </span>
            )}

            <span
                className="text-zinc-300 font-sans font-semibold text-[8px] tracking-wide break-words"
                style={{ textShadow: '0 1px 1.5px rgba(0,0,0,0.85)' }}
            >
                {showTranslated && translatedText ? <span className="italic opacity-90">{displayedText}</span> : displayedText}
            </span>

            {showFollowButton && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onFollow(user);
                    }}
                    className="ml-1 w-3.5 h-3.5 bg-[#a855f7] hover:bg-[#b055f7] text-white rounded-full inline-flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 align-middle"
                    aria-label={`Seguir ${user.name}`}
                >
                    <PlusIcon className="w-2 h-2" />
                </button>
            )}
        </div>
    );
};

export default EntryChatMessage;

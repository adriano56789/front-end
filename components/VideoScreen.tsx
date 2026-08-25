
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FeedPhoto, User } from '../types';
import { LoadingSpinner } from './Loading';
import { useTranslation } from '../i18n';
import { PlayIcon } from './icons';

interface VideoScreenProps {
  onViewProfile: (user: User) => void;
  onOpenPhotoViewer: (photos: FeedPhoto[], index: number) => void;
}

const VideoScreen: React.FC<VideoScreenProps> = ({ onViewProfile, onOpenPhotoViewer }) => {
  const [feed, setFeed] = useState<FeedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    setIsLoading(true);
    // 🔒 Explorar mostra apenas o conteúdo do PRÓPRIO usuário (fotos postadas no perfil)
    api.getPhotoFeed((window as any).currentUser?.id || undefined)
      .then(data => {
        setFeed(data || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#111] h-full text-white overflow-y-auto no-scrollbar pb-24">
      <header className="p-4 text-center sticky top-0 bg-[#111]/80 backdrop-blur-sm z-10">
        <h1 className="text-xl font-bold">Explorar</h1>
      </header>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      ) : feed.length > 0 ? (
        <div className="grid grid-cols-3 gap-0.5">
          {feed.map((item, index) => {
             const isVideo = (item.mediaUrl && item.mediaUrl.startsWith('data:video')) || (item.mediaUrl && item.mediaUrl.endsWith('.mp4'));
             return (
                <div key={item.id} className="relative aspect-square group cursor-pointer" onClick={() => onOpenPhotoViewer(feed, index)}>
                    {isVideo ? (
                        item.mediaUrl ? <video src={item.mediaUrl} className="w-full h-full object-cover bg-gray-800" muted /> : <div className="w-full h-full bg-gray-800" />
                    ) : (
                        item.mediaUrl ? <img src={item.mediaUrl} alt={`Post by ${item.user.name}`} className="w-full h-full object-cover bg-gray-800" /> : <div className="w-full h-full bg-gray-800" />
                    )}
                    
                    {isVideo && (
                        <>
                            <div className="absolute top-1 right-1 bg-black/40 rounded-full p-1">
                                <PlayIcon className="w-3 h-3 text-white" />
                            </div>
                            {item.duration && (
                                <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5 text-[10px] text-white font-medium">
                                    {formatDuration(item.duration)}
                                </div>
                            )}
                        </>
                    )}
                    
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                        <button onClick={(e) => { e.stopPropagation(); onViewProfile(item.user); }} className="flex items-center space-x-1">
                        {item.user.avatarUrl ? <img src={item.user.avatarUrl} alt={item.user.name} className="w-4 h-4 rounded-full object-cover" /> : <div className="w-4 h-4 rounded-full bg-gray-600" />}
                        <span className="text-white text-xs font-semibold truncate">{item.user.name}</span>
                        </button>
                    </div>
                </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
            <p>Nenhuma foto para explorar ainda.</p>
        </div>
      )}
    </div>
  );
};

export default VideoScreen;

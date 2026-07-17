
import React, { useState, useEffect } from 'react';
import { User, FeedPhoto } from '../types';
import { BackIcon, MaleIcon, FemaleIcon, RankIcon, MoreVerticalIcon, PencilIcon, ChevronRightIcon, CopyIcon, PlayIcon, HeartIcon, DetailsIcon, VIPBadgeIcon, ShieldIcon, LiveIndicatorIcon, TrashIcon } from './icons';
import BlockReportModal from './BlockReportModal';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
// Socket.IO removido — eventos de presente via API
import { LoadingSpinner } from './Loading';
import AvatarWithFrame from './ui/AvatarWithFrame';
import { useUserStatus, formatLastSeen } from '../hooks/useUserStatus';
import { base64ConversionService, processUserImages, isValidImageUrl } from '../services/base64ConversionService';
import { calculateDistanceInKm, formatDistance } from '../utils/location';

interface UserProfileScreenProps {
  user: User;
  isCurrentUser: boolean;
  onBack: () => void;
  onEdit: () => void;
  onOpenTopFans: () => void;
  onOpenFollowing: () => void;
  onOpenFans: () => void;
  onFollow: (user: User) => void;
  onStartChat: (user: User) => void;
  onBlockUser: (user: User) => void;
  onReportUser: (user: User) => void;
  onOpenPhotoViewer: (photos: FeedPhoto[], index: number) => void;
  lastPhotoLikeUpdate: number;
  onPhotoLiked: () => void;
  onPhotoRemoved?: (updatedUser: User) => void;
  onPhotoUploaded?: () => void; // Callback para quando nova foto é upload
}

const IMAGE_PLACEHOLDER = '/placeholders/avatar-placeholder.svg';

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  if (e.currentTarget.src !== IMAGE_PLACEHOLDER && !e.currentTarget.src.includes(IMAGE_PLACEHOLDER)) {
    e.currentTarget.src = IMAGE_PLACEHOLDER;
  }
};

const formatNumber = (num: any): string => {
    const numericValue = Number(num);
    if (num === null || num === undefined || isNaN(numericValue)) {
        return '0';
    }
    if (numericValue >= 1000000) {
        return (numericValue / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (numericValue >= 1000) {
        return (numericValue / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return String(numericValue);
};

const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const isVideoUrl = (url: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('data:video') || 
           lowerUrl.endsWith('.mp4') || 
           lowerUrl.endsWith('.webm') || 
           lowerUrl.endsWith('.mov') ||
           lowerUrl.includes('video');
};

const StatItem = ({ value, label, onClick }: { value: string | number; label: string; onClick?: () => void }) => (
    <button onClick={onClick} className="text-center focus:outline-none disabled:cursor-default" disabled={!onClick}>
        <p className="text-lg font-extrabold text-white leading-tight">{value}</p>
        <p className="text-xs text-gray-400 mt-1 leading-tight">{label}</p>
    </button>
);

const ProfileTab = ({ label, icon, isActive, onClick }: { label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`py-3 font-medium transition-colors relative flex items-center ${isActive ? 'text-white' : 'text-gray-500'}`}>
        {icon}
        {label}
        {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 rounded-full"></div>}
    </button>
);
const LevelBadge = ({ level }: { level: number }) => {
    let bgGrad = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%)';
    let textCol = '#374151'; // dark silver-grey text for silver levels
    let borderColor = '#9ca3af'; // silver border
    let glow = '0 0 6px rgba(156, 163, 175, 0.3)';
    let starColor = 'text-slate-500 fill-current';

    if (level >= 41) {
        // Red/rose profile level style matching UserLevelsScreen for top levels
        bgGrad = 'linear-gradient(135deg, #ffe4e6 0%, #f43f5e 50%, #9f1239 100%)';
        textCol = '#ffffff';
        borderColor = '#fca5a5';
        glow = '0 0 10px rgba(244, 63, 94, 0.6)';
        starColor = 'text-rose-200 fill-current';
    } else if (level >= 21) {
        // Gold style
        bgGrad = 'linear-gradient(135deg, #fffbeb 0%, #f59e0b 50%, #78350f 100%)';
        textCol = '#ffffff';
        borderColor = '#fde047';
        glow = '0 0 10px rgba(245, 158, 11, 0.6)';
        starColor = 'text-amber-200 fill-current';
    } else if (level >= 11) {
        // Bronze style
        bgGrad = 'linear-gradient(135deg, #ffedd5 0%, #d97706 50%, #7c2d12 100%)';
        textCol = '#ffffff';
        borderColor = '#fed7aa';
        glow = '0 0 8px rgba(217, 119, 6, 0.5)';
        starColor = 'text-orange-200 fill-current';
    }

    return (
        <span
            style={{
                background: bgGrad,
                borderColor: borderColor,
                color: textCol,
                boxShadow: `${glow}, inset 0 1px 1.5px rgba(255, 255, 255, 0.4)`
            }}
            className="relative inline-flex items-center justify-center px-2 py-0.5 rounded-full border text-[9px] font-extrabold font-sans tracking-tight h-[18px] select-none space-x-0.5 overflow-hidden"
        >
            {/* Glass reflection shine overlay */}
            <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20 rounded-t-full pointer-events-none" />
            <RankIcon className={`w-2.5 h-2.5 relative z-10 ${starColor}`} />
            <span className="relative z-10 leading-none">Lvl. {level}</span>
        </span>
    );
};;

const AgeBadge = ({ gender = 'female', age }: { gender?: 'male' | 'female' | 'not_specified'; age?: number }) => {
    const isMale = gender === 'male';
    const displayAge = age && age > 0 ? age : 18;
    return (
        <span className={`text-white text-[11px] font-black px-1.5 py-0.5 rounded flex items-center space-x-1 select-none shadow-[0_1px_2px_rgba(0,0,0,0.3)] h-[18px] ${isMale ? 'bg-[#3b82f6]' : 'bg-[#ec4899]'}`}>
            {isMale ? <MaleIcon className="h-3 w-3 text-white" /> : <FemaleIcon className="h-3 w-3 text-white" />}
            <span>{displayAge}</span>
        </span>
    );
};

const UserProfileScreen = ({ user, isCurrentUser, onBack, onEdit, onOpenTopFans, onOpenFollowing, onOpenFans, onFollow, onStartChat, onBlockUser, onReportUser, onOpenPhotoViewer, lastPhotoLikeUpdate, onPhotoLiked, onPhotoRemoved, onPhotoUploaded }: UserProfileScreenProps) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('Obras');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [likedPhotos, setLikedPhotos] = useState<FeedPhoto[]>([]);
    const [isLoadingLikes, setIsLoadingLikes] = useState(false);
    const [obras, setObras] = useState<FeedPhoto[]>([]);
    const [isLoadingObras, setIsLoadingObras] = useState(false);
    const [realTopFans, setRealTopFans] = useState<any[]>([]);
    
    // Hook para status online do usuário
    const { status: userStatus, isLoading: statusLoading } = useUserStatus(user.id);
    // 🔧 SINCRONIZAÇÃO: Buscar dados frescos do usuário da API ao montar
    // Garante que enviados, receptores e diamonds reflitam o banco de dados real
    const [freshUser, setFreshUser] = useState<User>(user);
    const [lastUserUpdate, setLastUserUpdate] = useState<number>(Date.now());
    // Sincronizar freshUser quando o prop user mudar
    useEffect(() => {
        setFreshUser(user);
    }, [user]);

    // Buscar fâs reais do banco de dados (enviaram presentes)
    useEffect(() => {
        let isMounted = true;
        api.getRankingForPeriod('monthly', user.id)
            .then(data => {
                if (isMounted) {
                    setRealTopFans(data || []);
                }
            })
            .catch(err => {
                console.error('Error fetching top fans for profile:', err);
            });
        return () => { isMounted = false; };
    }, [user.id]);
    
    const loggedInUser = (window as any).currentUser;

    // Registrar visita no perfil assim que a página é carregada
    useEffect(() => {
        if (loggedInUser && user.id && String(loggedInUser.id) !== String(user.id)) {
            console.log(`[API-VISIT] Registrando visita no perfil de ${user.id} pelo usuário ${loggedInUser.id}`);
            api.recordVisit(user.id, loggedInUser.id).catch(err => {
                console.error('[API-VISIT-ERROR] Erro ao registrar visita no perfil:', err);
            });
        }
    }, [user.id, loggedInUser?.id]);
    
    let computedDistanceStr = '';
    
    if (loggedInUser && loggedInUser.id !== freshUser.id) {
        if (loggedInUser.latitude && loggedInUser.longitude && freshUser.latitude && freshUser.longitude) {
            const d = calculateDistanceInKm(loggedInUser.latitude, loggedInUser.longitude, freshUser.latitude, freshUser.longitude);
            computedDistanceStr = formatDistance(d);
        }
    }
    
    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;
        
        // Adicionar debounce mais longo e verificar se realmente precisa atualizar
        timeoutId = setTimeout(async () => {
            const now = Date.now();
            // Só atualizar se passou mais de 2 segundos desde a última atualização
            if (now - lastUserUpdate > 2000) {
                try {
                    const data = await api.getUser(user.id);
                    if (isMounted && data) {
                        // Processar automaticamente imagens Base64
                        const processedData = await processUserImages(data);
                        setFreshUser(processedData);
                        setLastUserUpdate(now);
                    }
                } catch (error) {
                    /* fallback: usar dados originais e processar localmente */
                    if (isMounted) {
                        const processedUser = await processUserImages(user);
                        setFreshUser(processedUser);
                    }
                }
            }
        }, 1000); // 1 segundo de debounce
        
        return () => { 
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [user.id, lastUserUpdate]);

    // 🎁 EVENTOS DE PRESENTE: Socket.IO removido — presentes sincronizados via API polling + LiveKit DataChannel

    // Obras - Fonte de verdade: freshUser.obras || user.obras
    useEffect(() => {
        let isMounted = true;
        if (activeTab === 'Obras') {
            setIsLoadingObras(true);
            
            // Usar obras do freshUser ou user diretamente (carregada no getUser do banco de dados real)
            const currentObras = freshUser?.obras || user.obras || [];
            if (currentObras.length > 0) {
                const transformedData = currentObras.map((obra: any, index: number) => ({
                    id: obra.id || String(index),
                    photoUrl: obra.url,
                    url: obra.url,
                    likes: (obra as any).likes || 0,
                    isLiked: !!(obra as any).isLiked,
                    user: user
                }));
                if (isMounted) {
                    setObras(transformedData);
                    setIsLoadingObras(false);
                }
            } else {
                // Tentar carregar da api.getUserPhotos de forma reativa por garantia
                api.getUserPhotos(user.id).then(response => {
                    if (isMounted) {
                        const photos = response?.data || [];
                        if (photos.length > 0) {
                            const transformedData = photos.map(photo => ({
                                id: (photo as any).obraId || (photo as any).id,
                                photoUrl: photo.photoUrl,
                                url: photo.photoUrl,
                                likes: typeof photo.likes === 'number' ? photo.likes : 0,
                                isLiked: !!photo.isLiked,
                                user: user
                            }));
                            setObras(transformedData);
                        } else {
                            setObras([]);
                        }
                        setIsLoadingObras(false);
                    }
                }).catch(err => {
                    console.error('Erro ao buscar obras da galeria:', err);
                    if (isMounted) {
                        setObras([]);
                        setIsLoadingObras(false);
                    }
                });
            }
        }
        return () => { isMounted = false; };
    }, [activeTab, user.id, lastPhotoLikeUpdate, onPhotoUploaded, freshUser?.obras, user.obras]);

    useEffect(() => {
        let isMounted = true;
        if (activeTab === 'Curtidas') {
            setIsLoadingLikes(true);
            api.getLikedPhotos(user.id).then(data => {
                if (isMounted) {
                    setLikedPhotos(data || []);
                    setIsLoadingLikes(false);
                }
            }).catch(err => {
                if (isMounted) setIsLoadingLikes(false);
            });
        }
        return () => { isMounted = false; };
      }, [activeTab, user.id, lastPhotoLikeUpdate]);

    const handleToggleLike = async (photoId: string, tab: 'obras' | 'curtidas') => {
        const list = tab === 'obras' ? obras : likedPhotos;
        const listSetter = tab === 'obras' ? setObras : setLikedPhotos;

        const photoIndex = list.findIndex((p: any) => p.id === photoId);
        if (photoIndex === -1) return;

        const originalPhoto = list[photoIndex];
        const originalList = [...list];

        // Optimistic update
        const updatedPhoto = {
            ...originalPhoto,
            isLiked: !originalPhoto.isLiked,
            likes: originalPhoto.isLiked ? originalPhoto.likes - 1 : originalPhoto.likes + 1,
        };
        const newList = [...list];
        newList[photoIndex] = updatedPhoto;
        listSetter(newList);

        try {
            const response = await api.likePhoto(photoId);
            if (response.success) {
                // Sync with server state
                const finalPhoto = {
                    ...updatedPhoto,
                    isLiked: response.isLiked,
                    likes: response.likes,
                };
                const finalList = [...originalList]; 
                finalList[photoIndex] = finalPhoto;
                
                if (tab === 'curtidas' && !response.isLiked) {
                    listSetter(finalList.filter((p: any) => p.id !== photoId));
                } else {
                    listSetter(finalList);
                }

                onPhotoLiked();
            } else {
                listSetter(originalList);
            }
        } catch (error) {
            listSetter(originalList);
        }
    };

    const handleRemovePhoto = async (photoId: string) => {
        if (!isCurrentUser) return;
        const newObrasList = obras.filter((p: any) => p.id !== photoId);
        try {
            // Endpoint dedicado DELETE /user/photo/:photoId - remove do banco
            await api.profile.deleteImage(photoId, user.id);
            setObras(newObrasList);
            const fresh = await api.getUser(user.id);
            if (fresh) {
                setFreshUser(fresh);
                onPhotoRemoved?.(fresh);
            }
        } catch (e) {
            console.error('Erro ao remover foto:', e);
        }
    };

    const getGender = (gender?: 'male' | 'female' | 'not_specified') => {
        switch (gender) {
            case 'male': return t('common.male');
            case 'female': return t('common.female');
            default: return t('common.notSpecified');
        }
    }

    const handleFollowClick = () => {
        onFollow(user);
    };

    const handleUnfriend = () => {
        onFollow(user); 
        setIsModalOpen(false);
    };
    
    const handleBlock = () => {
        onBlockUser(user);
        setIsModalOpen(false);
    };

    const handleReport = () => {
        onReportUser(user);
        setIsModalOpen(false);
    };
    
    const detailItems = [
        { label: t('editProfile.nickname'), value: freshUser.name || 'Não especificado', show: !!freshUser.name },
        { label: t('editProfile.gender'), value: getGender(freshUser.gender), show: !!freshUser.gender && freshUser.gender !== 'not_specified' },
        { label: t('editProfile.birthday'), value: freshUser.birthday || 'Não especificado', show: !!freshUser.birthday },
        { label: t('editProfile.bio'), value: freshUser.bio || 'Não especificado', show: !!freshUser.bio },
        { label: t('editProfile.residence'), value: freshUser.residence || 'Não especificado', show: !!freshUser.residence },
        { label: t('editProfile.emotionalStatus'), value: freshUser.emotional_status || 'Não especificado', show: !!freshUser.emotional_status },
        { label: t('editProfile.tags'), value: freshUser.tags || 'Não especificado', show: !!freshUser.tags },
        { label: t('editProfile.profession'), value: freshUser.profession || 'Não especificado', show: !!freshUser.profession },
    ].filter(item => item.show);

    const hasDetails = detailItems.length > 0;
    const avatarSrc = freshUser.avatarUrl || (freshUser as any).avatar || user.avatarUrl || (user as any).avatar || IMAGE_PLACEHOLDER;
    const coverSrc = freshUser.coverUrl || user.coverUrl || avatarSrc;

    // Simplificado - sem frames para navegação isolada
        return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col text-white">
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-24">
                <header className="relative h-[520px] overflow-hidden w-full bg-[#121214]">
                    {/* Background Cover - Clear, colorful, fully lit, and bright layout with zero darkening overlays */}
                    <img 
                        key={coverSrc}
                        src={coverSrc}
                        onError={handleImageError}
                        alt="Background Cover"
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-300"
                        style={{
                            filter: 'none',
                            opacity: 1.0,
                            display: 'block',
                            objectPosition: 'top'
                        }}
                    />
                    
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                        <button onClick={onBack} className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm active:scale-90 transition-all">
                            <BackIcon className="w-5 h-5 text-white" />
                        </button>
                        <div className="flex items-center space-x-2">
                            {isCurrentUser && (
                               <button onClick={onEdit} className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm active:scale-90 transition-all">
                                   <PencilIcon className="w-5 h-5 text-white" />
                               </button>
                            )}
                           <button onClick={() => setIsModalOpen(true)} className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm active:scale-90 transition-all">
                               <MoreVerticalIcon className="w-5 h-5 text-white" />
                           </button>
                        </div>
                    </div>

                    {/* Centered Avatar on the bottom edge matching the image */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                        <div className="relative w-28 h-28">
                            {/* Double glowing ring with premium color borders */}
                            <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#FFD700] via-[#00f0ff] to-[#FFD700] shadow-[0_0_15px_rgba(0,240,255,0.3),0_0_15px_rgba(255,215,0,0.3)] flex items-center justify-center relative z-10">
                                <div className="w-full h-full rounded-full overflow-hidden border-2 border-black bg-[#121214]">
                                    <img 
                                        src={avatarSrc} 
                                        onError={handleImageError} 
                                        alt={user.name} 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                            </div>

                            {user.isLive && (user as any).streamStatus === 'active' && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/60 rounded-md px-2 py-1 flex items-center space-x-1.5 backdrop-blur-sm z-30">
                                  <LiveIndicatorIcon className="w-4 h-4 text-green-400" />
                                  <span className="text-xs font-bold text-white uppercase tracking-wider">{t('footer.live')}</span>
                                </div>
                            )}
                            
                            {/* Shield Verification emblem mark on the upper right edge */}
                            <div className="absolute -top-1 -right-1 bg-[#1a233d]/90 border border-[#00f0ff] rounded-full p-1 z-20 shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                                <svg className="w-4 h-4 text-[#00f0ff]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm-2-9l2 2 4-4" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>

                            {/* Circular country flag details on the bottom right edge */}
                            <div className="absolute -bottom-1 -right-1 bg-black/60 rounded-full p-0.5 z-20 border border-yellow-500/20 shadow-md">
                                <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                                    {(freshUser.country || user.country) && (
                                        <img src={`https://flagcdn.com/${(freshUser.country || user.country).toLowerCase()}.svg`} alt="country flag" className="w-full h-full object-cover" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="px-4 pt-6">
                    <div className="flex flex-col items-center">
                        {/* Gold style username matching the photo */}
                        <h1 className="text-2xl font-black mt-2 flex items-center justify-center space-x-2 text-[#e1ca7a] tracking-wide">
                            <span>{user.name}</span>
                            {user.isVIP && <VIPBadgeIcon className="w-6 h-6 flex-shrink-0" />}
                            
                            {/* Online / Offline status badge immediately to the right of the name */}
                            {statusLoading ? (
                                <span className="inline-flex items-center space-x-1 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full text-[10px] text-green-400 font-bold tracking-wider uppercase">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    <span>Online agora</span>
                                </span>
                            ) : userStatus ? (
                                <span className={`inline-flex items-center space-x-1 ${userStatus.is_online ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'} px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${userStatus.is_online ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
                                    <span>{userStatus.is_online ? 'Online agora' : formatLastSeen(userStatus.last_seen || new Date().toISOString())}</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center space-x-1 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full text-[10px] text-green-400 font-bold tracking-wider uppercase">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    <span>Online agora</span>
                                </span>
                            )}
                        </h1>

                        {/* ID text aligned with copies */}
                        <div className="flex items-center space-x-1.5 text-sm text-gray-400 mt-1">
                            <span>{t('profile.id')}: {user.id}</span>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(user.id);
                                }} 
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                <CopyIcon className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Gender and level badges row */}
                        <div className="flex items-center space-x-2 mt-3">
                            <AgeBadge gender={freshUser.gender || user.gender} age={freshUser.age || user.age} />
                            <LevelBadge level={freshUser.level || user.level || 5} />
                        </div>

                        {/* Separation indicator vertical line */}
                        <div className="w-[1px] h-3 bg-gray-800 my-4"></div>

                        {/* Filter details text */}
                        <p className="text-xs text-gray-400 select-none">
                            {freshUser.city && freshUser.state ? `${freshUser.city}, ${freshUser.state}` : (typeof freshUser.location === 'string' && freshUser.location !== 'desconhecido' ? freshUser.location : 'Brasil')}
                            {computedDistanceStr ? ` | ${computedDistanceStr}` : ''}
                        </p>
                    </div>
                    

                    {/* Stats divided beautifully in 4 columns like in the photo */}
                    <div className="grid grid-cols-4 gap-2 my-5 text-center bg-[#1c1c1e]/20 py-3 rounded-2xl border border-white/[0.02]">
                        <StatItem value={formatNumber(freshUser.fans || 0)} label={t('profile.fans')} onClick={onOpenFans} />
                        <StatItem value={formatNumber(freshUser.following || 0)} label={t('profile.following')} onClick={onOpenFollowing} />
                        <StatItem value={formatNumber(freshUser.receptores || 0)} label={t('profile.receivers')} />
                        <StatItem value={formatNumber(freshUser.enviados || 0)} label={t('profile.senders')} />
                    </div>

                    {/* Principais fãs bar with premium design and gold border and overlay miniatures */}
                    <button 
                        onClick={onOpenTopFans} 
                        className="border border-[#e1ca7a]/30 bg-gradient-to-r from-[#1c1c1e] via-[#161618] to-black/30 p-3.5 rounded-xl flex items-center justify-between w-full text-left hover:bg-gray-800/40 transition-all shadow-md group"
                    >
                        <div className="flex items-center space-x-3.5">
                            {realTopFans.length > 0 && (
                                <div className="flex -space-x-2.5">
                                    {realTopFans.slice(0, 3).map((fan: any, index: number) => {
                                        const fanAvatar = fan.avatarUrl || fan.avatar || IMAGE_PLACEHOLDER;
                                        return (
                                            <img 
                                                key={fan.id || index} 
                                                src={fanAvatar} 
                                                onError={handleImageError}
                                                alt={`Fan ${index + 1}`} 
                                                className="w-10 h-10 rounded-full border-2 border-[#e1ca7a] object-cover ring-2 ring-black" 
                                            />
                                        );
                                    })}
                                </div>
                            )}
                            <span className="font-bold text-sm text-[#e1ca7a] tracking-wide">{t('profile.topFans')}</span>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-[#e1ca7a]/60 group-hover:text-white transition-all transform group-hover:translate-x-0.5" />
                    </button>

                    <nav className="flex space-x-8 mt-5 border-b border-gray-900 justify-around">
                       <ProfileTab label={t('profile.tabs.works')} icon={<PlayIcon className="w-4 h-4" />} isActive={activeTab === 'Obras'} onClick={() => setActiveTab('Obras')} />
                       <ProfileTab label={t('profile.tabs.likes')} icon={<HeartIcon className="w-4 h-4" />} isActive={activeTab === 'Curtidas'} onClick={() => setActiveTab('Curtidas')} />
                       <ProfileTab label={t('profile.tabs.details')} icon={<DetailsIcon className="w-4 h-4" />} isActive={activeTab === 'Detalhes'} onClick={() => setActiveTab('Detalhes')} />
                    </nav>

                    {activeTab === 'Obras' && (
                        isLoadingObras ? (
                            <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>
                        ) : obras.length > 0 ? (
                            <div className="grid grid-cols-3 gap-1 mt-4">
                                {obras.map((obra: any, index: number) => {
                                    const isVideo = isVideoUrl(obra.photoUrl);
                                                    
                                    return (
                                        <button 
                                            key={obra.id}
                                            onClick={() => onOpenPhotoViewer(obras, index)}
                                            className="relative group aspect-[3/4] bg-[#2c2c2e] focus:outline-none overflow-hidden"
                                        >
                                            {isCurrentUser && (
                                                <div
                                                    onClick={(e: any) => { e.stopPropagation(); handleRemovePhoto(obra.id); }}
                                                    className="absolute top-1 right-1 z-20 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg cursor-pointer"
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e: any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleRemovePhoto(obra.id); } }}
                                                    aria-label="Remover foto"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                            {isVideo ? (
                                                <div className="w-full h-full relative">
                                                    <video 
                                                        src={obra.photoUrl} 
                                                        className="w-full h-full object-cover" 
                                                        muted 
                                                        playsInline
                                                        preload="metadata"
                                                    />
                                                    <div className="absolute top-1 right-1 bg-black/40 rounded-full p-1">
                                                        <PlayIcon className="w-3 h-3 text-white" />
                                                    </div>
                                                    {obra.duration && (
                                                        <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5 text-[10px] text-white font-medium">
                                                            {formatDuration(obra.duration)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <img 
                                                    src={isValidImageUrl(obra.photoUrl) ? obra.photoUrl : IMAGE_PLACEHOLDER} 
                                                    onError={handleImageError} 
                                                    alt={`Obra ${index + 1}`} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none opacity-50"></div>
                                            
                                            <div className="absolute bottom-1 left-1 flex items-center space-x-0.5 text-white text-xs font-bold drop-shadow-md z-10">
                                                 <HeartIcon className={`w-3 h-3 ${obra.isLiked ? 'text-red-500' : 'text-white'}`} fill={obra.isLiked ? 'currentColor' : 'none'} />
                                                 <span>{formatNumber(obra.likes)}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-48 text-gray-500">
                                <p>{t('profile.noWorks')}</p>
                            </div>
                        )
                    )}
                     {activeTab === 'Curtidas' && (
                        isLoadingLikes ? (
                            <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>
                        ) : likedPhotos.length > 0 ? (
                            <div className="grid grid-cols-3 gap-1 mt-4">
                                {likedPhotos.map((photo: any, index: number) => {
                                     const isVideo = isVideoUrl(photo.photoUrl);
                                    return (
                                    <button 
                                        key={photo.id}
                                        onClick={() => onOpenPhotoViewer(likedPhotos, index)}
                                        className="relative group aspect-[3/4] bg-[#2c2c2e] focus:outline-none overflow-hidden"
                                    >
                                        {isVideo ? (
                                            <div className="w-full h-full relative">
                                                 <video src={photo.photoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                                 <div className="absolute top-1 right-1 bg-black/40 rounded-full p-1"><PlayIcon className="w-3 h-3 text-white" /></div>
                                                  {photo.duration && (
                                                        <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5 text-[10px] text-white font-medium">
                                                            {formatDuration(photo.duration)}
                                                        </div>
                                                    )}
                                            </div>
                                        ) : (
                                            <img 
                                                src={isValidImageUrl(photo.photoUrl) ? photo.photoUrl : IMAGE_PLACEHOLDER} 
                                                onError={handleImageError} 
                                                alt={`Liked photo ${index + 1}`} 
                                                className="w-full h-full object-cover" 
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none opacity-50"></div>
                                        
                                        <div className="absolute bottom-1 left-1 flex items-center space-x-0.5 text-white text-xs font-bold drop-shadow-md z-10">
                                            <HeartIcon className={`w-3 h-3 ${photo.isLiked ? 'text-red-500' : 'text-white'}`} fill={photo.isLiked ? 'currentColor' : 'none'} />
                                            <span>{formatNumber(photo.likes)}</span>
                                        </div>
                                    </button>
                                )})}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-48 text-gray-500">
                                <p>{t('profile.noLikes')}</p>
                            </div>
                        )
                    )}
                     {activeTab === 'Detalhes' && (
                        hasDetails ? (
                            <div className="bg-[#1c1c1e] rounded-lg p-4 mt-4 text-sm">
                                <h2 className="text-lg font-bold mb-4 text-white">{t('profile.profileInfo')}</h2>
                                <div className="space-y-4">
                                    {detailItems.map((item) => (
                                        <div key={item.label} className="flex items-start">
                                            <span className="text-gray-400 w-28 flex-shrink-0">{item.label}</span>
                                            <span className="text-white break-words">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-48 text-gray-500">
                                <p>{t('profile.noDetails')}</p>
                            </div>
                        )
                    )}
                </main>
            </div>
            
            {!isCurrentUser && (
                <footer className="absolute bottom-0 left-0 right-0 bg-black p-3 flex-shrink-0 z-10 border-t border-gray-800/50">
                    <div className="flex items-center space-x-3">
                        <button onClick={handleFollowClick} className={`flex-1 font-bold py-3 rounded-full transition-colors ${user.isFollowed ? 'bg-gray-700 text-gray-300' : 'bg-purple-600 text-white'}`}>
                            {user.isFollowed ? t('common.following') : t('common.follow')}
                        </button>
                        <button onClick={() => onStartChat(user)} className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-full transition-colors">
                            {t('common.chat')}
                        </button>
                    </div>
                </footer>
            )}

            <BlockReportModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onBlock={handleBlock}
                onReport={handleReport} 
                onUnfriend={user.isFollowed ? handleUnfriend : undefined} 
            />
        </div>
    );
};

export default UserProfileScreen;

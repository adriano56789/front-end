import React, { useState, useEffect, useRef } from 'react';

import { CloseIcon, ExpandIcon, SwitchCameraIcon } from './icons';

import { Streamer, ToastType, User, BeautySettings } from '../types';

import BeautyEffectsPanel from './live/BeautyEffectsPanel';

import LiveStreamManualModal from './live/LiveStreamManualModal';
import RegionModal from './RegionModal';

import { useTranslation } from '../i18n';

import { useStreamManager } from '../hooks/useStreamManager';
import { useStreamUrls } from '../hooks/useStreamUrls';
import { useCameraPreview } from '../hooks/useCameraPreview';

import { StreamConfigForm } from './live/StreamConfigForm';
import { CategorySelector, CATEGORIES } from './live/CategorySelector';
import { StreamTypeSelector } from './live/StreamTypeSelector';
import { StreamUrlConfig } from './live/StreamUrlConfig';
import { CategoryModal } from './live/CategoryModal';
import { StreamToolsPanel } from './live/StreamToolsPanel';

import { StreamService } from '../services/streamService';
import { streamPublishService } from '../services/streamPublishService';
import { api } from '../services/api';

// Interface para propriedades globais da window
declare global {
    interface Window {
        setGlobalStreamers?: (streamers: Streamer[]) => void;
    }
}

export interface InviteData {
    streamId: string;
    hostId: string;
    streamName: string;
    hostName: string;
    hostAvatar: string;
}

interface GoLiveScreenProps {
    isOpen: boolean;
    onClose: () => void;
    onStartStream: (streamer: Streamer) => void;
    onJoinStream?: (streamer: Streamer) => void;
    addToast: (type: ToastType, message: string) => void;
    currentUser: User;
    updateUser?: (user: User) => void;
    inviteData?: InviteData | null;
}

interface Category {
    key: string;
    label: string;
}

const GoLiveScreen: React.FC<GoLiveScreenProps> = ({ 
    isOpen, 
    onClose, 
    onStartStream, 
    onJoinStream, 
    addToast, 
    currentUser, 
    updateUser,
    inviteData 
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hooks modulares
    const cameraPreview = useCameraPreview(isOpen, addToast);
    const streamManager = useStreamManager(currentUser, addToast, cameraPreview.videoRef);
    const streamUrls = useStreamUrls(addToast);

    // Estado local para UI
    const [streamType, setStreamType] = useState('WebRTC');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    const handleSwitchCamera = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await streamPublishService.switchCamera();
            setFacingMode(streamPublishService.getFacingMode());
            addToast(ToastType.Success, "Câmera alterada!");
        } catch (err) {
            console.error('Failed to switch camera preview:', err);
            addToast(ToastType.Error, "Não foi possível alternar a câmera.");
        }
    };
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
    const [countries, setCountries] = useState<any[]>([]);
    const [isBeautyPanelOpen, setIsBeautyPanelOpen] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [categories] = useState<Category[]>(CATEGORIES);

    const isInviteMode = Boolean(inviteData);

    useEffect(() => {
        // Inicializar dados padrão
        if (isOpen && !streamManager.streamTitle) {
            streamManager.updateState({
                streamTitle: isInviteMode ? (inviteData?.streamName || "Sala Privada") : '', // Campo vazio para novas lives
                streamDescription: isInviteMode ? `Convite de ${inviteData?.hostName}` : '',
                selectedRegion: currentUser.country || 'global'
            });
        }
        
        if (isOpen && countries.length === 0) {
            api.getRegions().then(data => {
                if (data && Array.isArray(data)) {
                    setCountries(data);
                }
            }).catch(err => console.error("Error fetching regions:", err));
        }
    }, [isOpen, isInviteMode, inviteData, currentUser.name, currentUser.country, streamManager, countries.length]);

    const handleSelectCategory = async (categoryKey: string) => {
        streamManager.updateState({ selectedCategoryKey: categoryKey });
        setIsCategoryModalOpen(false);

        // Conectar à API para atualizar streams da categoria selecionada
        try {
            console.log('Buscando streams da categoria:', categoryKey);
            const streams = await api.getLiveStreamers(categoryKey);
            console.log('Streams recebidos:', streams);

            // Atualizar streams globais para refletir no Main
            if (window.setGlobalStreamers) {
                window.setGlobalStreamers(streams);
                console.log('Streams atualizados globalmente');
            }
        } catch (error) {
            console.error('Erro ao carregar streams da categoria:', error);
        }
    };

    const handleSaveUrls = async () => {
        const updatedStream = await streamUrls.saveUrls(streamManager.draftStream);
        if (updatedStream !== null && updatedStream !== undefined) {
            streamManager.updateState({ draftStream: updatedStream });
        }
    };

    const handleSaveChanges = async () => {
        // Se não tem draft, cria primeiro (igual ao simulado: save sempre tem stream)
        let stream = streamManager.draftStream;
        if (!stream) {
            stream = await streamManager.createDraftStream();
            if (!stream) return;
        }

        await streamManager.updateStreamDetails({
            name: streamManager.streamTitle,
            message: streamManager.streamDescription,
            tags: [streamManager.selectedCategoryKey],
            rtmpIngestUrl: streamUrls.editRtmpUrl,
            streamKey: streamUrls.editStreamKey,
            srtIngestUrl: streamUrls.editSrtUrl,
            playbackUrl: streamUrls.editPlaybackUrl
        });
    };

    const handleAddCover = () => {
        fileInputRef.current?.click();
    };

    const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await streamManager.uploadCover(file);
        }
        e.target.value = '';
    };

    const handleInitiateStream = async () => {
        // Garantir que o draftStream existe ANTES de iniciar a transmissão
        // Evita que o initiateStream precise chamar api.createStream() novamente
        let stream = streamManager.draftStream;
        if (!stream) {
            stream = await streamManager.createDraftStream();
            if (!stream) {
                addToast(ToastType.Error, "Falha ao preparar transmissão. Tente novamente.");
                return;
            }
        }
        await streamManager.initiateStream(onStartStream, onJoinStream, inviteData);
    };

    const handleRegionChange = (region: string) => {
        streamManager.updateState({ 
            selectedRegion: region,
            selectedCategoryKey: CATEGORIES[0]?.key || 'popular'
        });
        // Persistir região selecionada no backend (apenas códigos de país reais, não ICON_GLOBE)
        if (currentUser?.id && region && region !== 'ICON_GLOBE' && updateUser) {
            api.updateProfile(currentUser.id, { country: region.toLowerCase() })
                .then(() => {
                    // Atualizar currentUser localmente para refletir a mudança imediatamente
                    updateUser({ ...currentUser, country: region.toLowerCase() });
                })
                .catch(err => console.error('❌ [REGION] Erro ao salvar região:', err));
        }
    };

    const handleTogglePrivate = () => {
        streamManager.updateState({ isPrivate: !streamManager.isPrivate });
    };

    const selectedCategoryLabel = categories.find(c => c.key === streamManager.selectedCategoryKey)?.label || streamManager.selectedCategoryKey;

    return (
        <div
            className={`absolute inset-0 bg-black z-50 transition-opacity duration-300 flex flex-col justify-between perspective-viewport ${
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            {/* Ghost Preview - 144p real com upscale visual Full HD */}
            <video
                ref={cameraPreview.videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover -z-10"
                style={{
                    // Upscale visual CSS - 144p real exibido como Full HD
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)', // Mirror effect
                    filter: 'contrast(1.1) brightness(1.05) saturate(1.1)', // Melhoria visual
                    imageRendering: 'crisp-edges', // Mantém nitidez no upscale
                    // O vídeo continua 144p real, mas é escalado visualmente pelo container
                    objectFit: 'cover'
                }}
            />
            <div className="absolute inset-0" onClick={cameraPreview.showUi}></div>

            <header className="absolute top-0 right-0 p-4 flex items-center space-x-2 z-20">
                <button 
                    onClick={handleSwitchCamera} 
                    className={`w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white transition-opacity duration-300 ${
                        cameraPreview.isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    title="Alternar Câmera"
                >
                    <SwitchCameraIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={cameraPreview.hideUi} 
                    className={`w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white transition-opacity duration-300 ${
                        cameraPreview.isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    <ExpandIcon className="w-5 h-5" />
                </button>
                <button onClick={onClose} className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </header>

            <div
                className={`z-10 transition-opacity duration-300 ${
                    cameraPreview.isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 space-y-4">
                    {/* Stream Configuration Form */}
                    <StreamConfigForm
                        streamTitle={streamManager.streamTitle}
                        streamDescription={streamManager.streamDescription}
                        onTitleChange={(title) => streamManager.updateState({ streamTitle: title })}
                        onDescriptionChange={(description) => streamManager.updateState({ streamDescription: description })}
                        onSave={handleSaveChanges}
                        onAddCover={handleAddCover}
                        draftStream={streamManager.draftStream}
                        isInviteMode={isInviteMode}
                        currentUser={currentUser}
                    />

                    {/* Category and Region Selector */}
                    <CategorySelector
                        selectedCategoryLabel={selectedCategoryLabel}
                        selectedRegion={streamManager.selectedRegion}
                        onCategoryClick={() => setIsCategoryModalOpen(true)}
                        onRegionChange={handleRegionChange}
                        onRegionSelectClick={() => setIsRegionModalOpen(true)}
                        isInviteMode={isInviteMode}
                    />

                    {/* Stream Tools Panel */}
                    <StreamToolsPanel
                        onOpenManual={() => setIsManualOpen(true)}
                        onOpenBeautyPanel={() => setIsBeautyPanelOpen(true)}
                        isPrivate={streamManager.isPrivate}
                        onTogglePrivate={handleTogglePrivate}
                        isInviteMode={isInviteMode}
                    />
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleCoverFileChange} accept="image/jpeg,image/png,image/webp" className="hidden" />

            <footer className="p-4 z-20">
                <button
                    onClick={handleInitiateStream}
                    className={`w-full font-bold py-4 rounded-full transition-colors ${
                        isInviteMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-500 hover:bg-green-600'
                    } text-white`}
                >
                    {isInviteMode ? "Entrar na Sala" : t('goLive.startStream')}
                </button>
            </footer>

            {/* Modals */}
            {isCategoryModalOpen && (
                <CategoryModal 
                    categories={categories} 
                    selectedCategoryKey={streamManager.selectedCategoryKey} 
                    onSelectCategory={handleSelectCategory} 
                    onClose={() => setIsCategoryModalOpen(false)} 
                />
            )}
            <RegionModal 
                isOpen={isRegionModalOpen} 
                onClose={() => setIsRegionModalOpen(false)} 
                countries={countries.length > 0 ? countries : [
                    { code: 'global', name: 'Global' },
                    { code: 'br', name: 'Brasil' },
                    { code: 'us', name: 'Estados Unidos' },
                    { code: 'pt', name: 'Portugal' },
                    { code: 'es', name: 'Espanha' },
                    { code: 'ar', name: 'Argentina' },
                    { code: 'co', name: 'Colômbia' },
                    { code: 'mx', name: 'México' },
                    { code: 'it', name: 'Itália' },
                    { code: 'fr', name: 'França' },
                    { code: 'de', name: 'Alemanha' },
                    { code: 'gb', name: 'Reino Unido' },
                    { code: 'ca', name: 'Canadá' }
                ]} 
                onSelectRegion={(countryCode) => {
                    handleRegionChange(countryCode);
                    setIsRegionModalOpen(false);
                }} 
                selectedCountryCode={streamManager.selectedRegion} 
            />
            {isBeautyPanelOpen && <BeautyEffectsPanel onClose={() => setIsBeautyPanelOpen(false)} currentUser={currentUser} addToast={addToast} />}

            {isManualOpen && <LiveStreamManualModal onClose={() => setIsManualOpen(false)} />}
        </div>
    );
};

export default GoLiveScreen;

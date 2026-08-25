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
import { videoProcessor, DEFAULT_BEAUTY_SETTINGS } from '../services/VideoProcessor';
import { beautyWebRTCIntegration } from '../services/BeautyWebRTCIntegration';
import { fetchAndApplyAutoBeauty } from '../services/autoBeauty';
import { setPreferredCameraResolution, getVideoConstraints } from '../services/cameraService';

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

    // 📐 Aplicar a RESOLUÇÃO DA CÂMERA salva no banco (chave cameraResolution
    // dentro das beauty settings). Roda UMA vez na montagem (o GoLiveScreen fica
    // montado sempre) — assim, quando a câmera abrir, o getUserMedia já usa a
    // resolução preferida do usuário em vez de um valor fixo.
    useEffect(() => {
        if (!currentUser?.id) return;
        let cancelled = false;
        api.getBeautySettings(currentUser.id)
            .then(saved => {
                if (cancelled || !saved) return;
                const res = saved['cameraResolution'];
                if (res === '1080p' || res === '720p' || res === '480p' || res === '360p' || res === 'auto') {
                    setPreferredCameraResolution(res);
                    console.log(`[GOLIVE] Resolução da câmera carregada do banco: ${res}`);
                }
            })
            .catch(err => console.warn('[GOLIVE] Falha ao carregar resolução da câmera:', err));
        return () => { cancelled = true; };
    }, [currentUser?.id]);

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

    // 🎨 FILTRO PADRÃO AUTOMÁTICO na abertura da câmera (estilo Tencent/Bigo):
    // nitidez + efeito 3D + clareza aplicados JÁ quando o preview liga, sem o
    // usuário precisar abrir o painel. O BeautyEffectsPanel (se aberto depois)
    // reutiliza o pipeline (videoProcessor.initialize é idempotente p/ a mesma
    // câmera) e sobrescreve com as preferências salvas do usuário.
    const autoBeautyRef = useRef(false);
    // 🔁 A câmera de celulares lentos demora bem mais que 400ms para ligar. Se o
    // srcObject ainda não existe, fica POLINDO a cada 400ms até chegar (máx 20s)
    // e então aplica o filtro padrão na hora — antes, era 1 tentativa só em 400ms
    // e o filtro simplesmente NÃO LIGAVA quando a câmera demorava.
    useEffect(() => {
        if (!isOpen) return;
        if (autoBeautyRef.current) return;

        const tryApply = () => {
            if (autoBeautyRef.current) return;
            const video = cameraPreview.videoRef.current;
            if (video && video.srcObject) {
                applyDefaultBeautyToCamera(video);
            }
        };

        tryApply();
        if (!autoBeautyRef.current && !cameraPreview.videoRef.current?.srcObject) {
            const poll = setInterval(tryApply, 400);
            const stopTimer = setTimeout(() => clearInterval(poll), 20000);
            return () => { clearInterval(poll); clearTimeout(stopTimer); };
        }
    }, [isOpen, cameraPreview.videoRef]);

    // 🔁 Zera o ref ao FECHAR a live — senão a 2ª abertura entrava SEM o filtro
    // padrão (o ref ficava true para sempre após a primeira aplicação).
    useEffect(() => {
        if (!isOpen) autoBeautyRef.current = false;
    }, [isOpen]);

    const applyDefaultBeautyToCamera = async (video: HTMLVideoElement) => {
        try {
            if (autoBeautyRef.current) return;
            autoBeautyRef.current = true;

            // ✅ Aplicar o filtro 2D padrão (nitidez 55, 3D 45, clareza/brilho)
            videoProcessor.updateBeautySettings({ ...DEFAULT_BEAUTY_SETTINGS });

            // Iniciar pipeline WebGL (idempotente — painel reutiliza depois)
            const success = await videoProcessor.initialize(video);
            if (!success) return;

            const processedStream = videoProcessor.startProcessing();
            if (!processedStream) return;

            // Conectar ao pipeline de publicação (replaceTrack no SRS quando publicar)
            streamPublishService.setBeautyProcessedStream(processedStream);
            // 🎥 Mostrar o efeito JÁ NO PREVIEW (a câmera aberta exibe o stream
            // processado, não a imagem crua). O painel, se aberto depois, continua
            // sobrescrevendo as configurações do usuário normalmente.
            streamPublishService.applyBeautyToPreview();
            if (streamPublishService.isPublishing()) {
                await streamPublishService.updateBeautyTrack();
            }

            await beautyWebRTCIntegration.initialize(processedStream);

            // ✅ Se o usuário tem configurações salvas, elas VENCEM o padrão.
            // Chaves não salvas mantêm o DEFAULT (imagem limpa/jovem/nítida) —
            // não zeram como antigamente. (Lógica compartilhada com a sala de
            // transmissão — services/autoBeauty.ts)
            await fetchAndApplyAutoBeauty(currentUser?.id);

            console.log('✅ [GOLIVE] Filtro padrão aplicado na abertura da câmera (nitidez + 3D)');
        } catch (e) {
            console.error('❌ [GOLIVE] Erro ao aplicar filtro padrão:', e);
        }
    };

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

    // 📐 Resolução da CÂMERA escolhida no painel: aplica na hora (a próxima
    // captura usa as constraints novas) e SALVA NO BANCO junto com os efeitos
    // (updateBeautySettings) — persiste entre aparelhos/sessões.
    const handleSelectCameraResolution = async (resolution: '1080p' | '720p' | '480p' | '360p' | 'auto') => {
        try {
            setPreferredCameraResolution(resolution);

            // Persistir no banco junto das beauty settings
            const saved = await api.getBeautySettings(currentUser.id);
            const settings: BeautySettings = {
                ...(saved || {}),
                cameraResolution: resolution,
            };
            await api.updateBeautySettings(currentUser.id, settings);

            // Aplicar na track ativa sem precisar reabrir a câmera
            const stream = streamPublishService.getCurrentStream();
            const liveTrack = stream?.getVideoTracks?.().find(t => t.readyState === 'live');
            if (liveTrack && typeof liveTrack.applyConstraints === 'function') {
                try {
                    await liveTrack.applyConstraints(getVideoConstraints(streamPublishService.getFacingMode(), resolution));
                } catch (applyErr) {
                    console.warn('[GOLIVE] applyConstraints da nova resolução falhou (será aplicado na próxima captura):', applyErr);
                }
            }

            addToast(ToastType.Success, `Resolução da câmera alterada para ${resolution}`);
        } catch (err) {
            console.error('❌ [GOLIVE] Falha ao salvar resolução da câmera:', err);
            addToast(ToastType.Error, 'Falha ao salvar a resolução da câmera.');
        }
    };

    const selectedCategoryLabel = categories.find(c => c.key === streamManager.selectedCategoryKey)?.label || streamManager.selectedCategoryKey;

    return (
        <div
            className={`absolute inset-0 bg-black z-50 transition-opacity duration-300 flex flex-col justify-between perspective-viewport ${
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            {/* 📷 Preview com a resolução NATIVA da câmera (720p+) — sem upscale
                pixelado. A nitidez vem da própria captura HD, não de hacks de CSS. */}
            <video
                ref={cameraPreview.videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover -z-10"
                style={{
                    // Mirror effect (frontal)
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)',
                    filter: 'contrast(1.1) brightness(1.05) saturate(1.1)', // Melhoria visual leve
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
                        onSelectCameraResolution={handleSelectCameraResolution}
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
            {isBeautyPanelOpen && <BeautyEffectsPanel onClose={() => setIsBeautyPanelOpen(false)} currentUser={currentUser} addToast={addToast} videoRef={cameraPreview.videoRef} />}

            {isManualOpen && <LiveStreamManualModal onClose={() => setIsManualOpen(false)} />}
        </div>
    );
};

export default GoLiveScreen;

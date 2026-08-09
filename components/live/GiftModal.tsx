import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Gift, User } from '../../types';
import { YellowDiamondIcon, CheckIcon } from '../icons';
import { useTranslation } from '../../i18n';
import { api } from '../../services/api';
import { enrichGiftsWithComponents } from './GiftSvgHelper';

interface GiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    userDiamonds: number;
    onSendGift: (gift: Gift, quantity: number) => void;
    onRecharge: () => void;
    gifts: Gift[];
    receivedGifts: (Gift & { count: number })[];
    isBroadcaster?: boolean;
    isSendingGift?: boolean;
    isVIP: boolean;
    onOpenVIPCenter: () => void;
    currentUser: User;
}

const GiftModal: React.FC<GiftModalProps> = ({ isOpen, onClose, userDiamonds, onSendGift, onRecharge, gifts, receivedGifts, isBroadcaster = false, isSendingGift = false, isVIP, onOpenVIPCenter, currentUser }) => {
    const { t } = useTranslation();
    // 🔑 Dono do app (Adriano): único que, ao transmitir (host), pode enviar
    // presente para si mesmo. Hosts comuns não podem.
    const isAppOwner = currentUser?.id === 'adriano' || currentUser?.id === '98501723' || currentUser?.id === '65384127' || currentUser?.id === ':98501723' || currentUser?.name?.toLowerCase() === 'adriano';
    const [isEditMode, setIsEditMode] = useState(false);
    const [giftsByTab, setGiftsByTab] = useState<Record<string, Gift[]>>({});
    const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());
    const [receivedGiftsData, setReceivedGiftsData] = useState<Gift[]>([]);

    const dragItem = useRef<Gift | null>(null);
    const dragOverItem = useRef<Gift | null>(null);

    // Renderiza o visual de um presente: componente SVG (enriquecido), URL de imagem
    // (http ou caminho relativo /gifts/...) ou emoji como fallback.
    const renderGiftVisual = (gift: any) => {
        if (gift.component) return gift.component;
        if (typeof gift.icon === 'string' && (gift.icon.startsWith('http') || gift.icon.startsWith('/'))) {
            return <img src={gift.icon} alt={gift.name} className="w-10 h-10 object-cover rounded-lg" />;
        }
        return gift.icon;
    };

    const giftCategories = useMemo(() => {
        const categories: (Gift['category'] | 'Galeria')[] = ['Popular', 'Luxo', 'VIP', 'Efeito', 'Entrada', 'Galeria'];
        return categories;
    }, []);

    const [activeTab, setActiveTab] = useState<(Gift['category'] | 'Galeria')>(giftCategories[0]);

    // Função para buscar presentes por categoria da API
    // silent: não mostra o estado de carregamento (usado para refresh em segundo plano)
    const fetchGiftsByCategory = async (category: string, silent = false) => {
        if (category === 'Galeria') {
            // Buscar presentes recebidos pelo usuário
            if (!silent) setLoadingCategories(prev => new Set(prev).add(category));
            try {
                // Usar o ID do usuário atual real
                const userId = currentUser.id;
                const receivedGifts = await api.getReceivedGifts(userId);
                // Adicionar componentes SVG aos presentes recebidos para exibir
                // os mesmos ícones do painel de envio (fallback para o emoji/URL).
                setReceivedGiftsData(enrichGiftsWithComponents(receivedGifts));
            } catch (error) {
            } finally {
                if (!silent) {
                    setLoadingCategories(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(category);
                        return newSet;
                    });
                }
            }
            return;
        }
        
        setLoadingCategories(prev => new Set(prev).add(category));
        try {
            const categoryGifts = await api.getGiftsByCategory(category);
            const enriched = enrichGiftsWithComponents(categoryGifts);
            setGiftsByTab(prev => ({
                ...prev,
                [category]: enriched
            }));
        } catch (error) {
            // Fallback para gifts originais se a API falhar
            const fallbackGifts = gifts.filter(gift => gift.category === category);
            const enrichedFallback = enrichGiftsWithComponents(fallbackGifts);
            setGiftsByTab(prev => ({
                ...prev,
                [category]: enrichedFallback
            }));
        } finally {
            setLoadingCategories(prev => {
                const newSet = new Set(prev);
                newSet.delete(category);
                return newSet;
            });
        }
    };

    // Função chamada quando uma aba é clicada
    const handleTabChange = (tab: Gift['category'] | 'Galeria') => {
        setActiveTab(tab);
        fetchGiftsByCategory(tab); // Chamar para todas as abas, incluindo Galeria
    };

    useEffect(() => {
        const groupedGifts = gifts.reduce((acc, gift) => {
            const category = gift.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(gift);
            return acc;
        }, {} as Record<string, Gift[]>);
        setGiftsByTab(groupedGifts);
    }, [gifts]);

    useEffect(() => {
        if (isOpen) {
            fetchGiftsByCategory(activeTab);
        }
    }, [isOpen, activeTab]);

    // 🔧 Host: manter a Galeria sempre atualizada durante a live — conforme novos
    // presentes chegam, a lista acumula automaticamente enquanto o painel está aberto.
    useEffect(() => {
        if (!isOpen || activeTab !== 'Galeria') return;
        const intervalId = setInterval(() => {
            fetchGiftsByCategory('Galeria', true);
        }, 8000);
        return () => clearInterval(intervalId);
    }, [isOpen, activeTab]);

    // 🔧 Sincronizar a aba ativa quando o papel muda (espectador → host) para
    // garantir que o painel sempre começa no mesmo estado para os dois.
    useEffect(() => {
        setActiveTab(giftCategories[0]);
    }, [isBroadcaster]);

    const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
    const [quantity, setQuantity] = useState(1);
    const presetQuantities = [1, 10, 99, 188, 520, 1314];

    useEffect(() => {
        if (isEditMode) {
            setSelectedGift(null);
        }
    }, [isEditMode]);

    useEffect(() => {
        setIsEditMode(false);
    }, [activeTab]);

    const filteredGifts = useMemo(() => {
        if (activeTab === 'Galeria') return [];
        // Host comum não envia presente para si mesmo: grade vazia (mantém
        // estrutura/abas, só o Galeria funciona). O DONO do app (host) envia
        // normalmente e vê todas as abas.
        if (isBroadcaster && !isAppOwner) return [];
        return giftsByTab[activeTab as string] || [];
    }, [activeTab, giftsByTab, isBroadcaster, isAppOwner]);
    
    const maxCanSend = useMemo(() => {
        if (!selectedGift || !selectedGift.price || selectedGift.price === 0) return 0;
        return Math.floor(userDiamonds / selectedGift.price);
    }, [selectedGift, userDiamonds]);

    const handleSend = () => {
        if (isEditMode || !selectedGift || isSendingGift) {
            return;
        }
        // Host comum não envia presente para si mesmo; só o dono do app.
        if (isBroadcaster && !isAppOwner) {
            return;
        }

        if (quantity > 0 && quantity * (selectedGift.price || 0) <= userDiamonds) {
            onSendGift(selectedGift, quantity);
            setSelectedGift(null);
            setQuantity(1);
            onClose();
        } else {
            onRecharge();
        }
    };

    const handleSelectGift = (gift: Gift) => {
        if (gift.category === 'VIP' && !isVIP) {
            onOpenVIPCenter();
            return;
        }
        setSelectedGift(gift);
        // Não resetar quantidade para permitir que usuário mantenha a quantidade escolhida
    };

    const canReorderCurrentTab = useMemo(() => {
        return ['Popular', 'Luxo', 'VIP', 'Efeito'].includes(activeTab);
    }, [activeTab]);
    
    const handleDragStart = (gift: Gift) => {
        dragItem.current = gift;
    };
    
    const handleDragEnter = (gift: Gift) => {
        dragOverItem.current = gift;
    };
    
    const handleDrop = () => {
        if (!dragItem.current || !dragOverItem.current || !giftsByTab[activeTab as string]) return;
    
        const currentGifts = [...giftsByTab[activeTab as string]];
        const dragItemIndex = currentGifts.findIndex(g => g.name === dragItem.current!.name);
        const dragOverItemIndex = currentGifts.findIndex(g => g.name === dragOverItem.current!.name);
    
        if (dragItemIndex === -1 || dragOverItemIndex === -1 || dragItemIndex === dragOverItemIndex) {
            return;
        }
    
        const newGifts = [...currentGifts];
        const [draggedItem] = newGifts.splice(dragItemIndex, 1);
        newGifts.splice(dragOverItemIndex, 0, draggedItem);
    
        setGiftsByTab(prev => ({
            ...prev,
            [activeTab as string]: newGifts
        }));

        dragItem.current = null;
        dragOverItem.current = null;
    };

    // 🔧 Overlay transparente: a transmissão continua CLARA quando o painel
    // de presentes abre (sem escurecer). O painel é um bottom sheet parcial.
    return (
        <div 
            className={`fixed inset-0 z-[100] flex items-end justify-center bg-transparent transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
            onClick={onClose}
        >
            <div 
                className={`bg-[#060608] border border-gray-900/60 w-full max-h-[88vh] h-auto rounded-t-3xl flex flex-col transform transition-all duration-300 ease-in-out shadow-2xl ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`} 
                onClick={e => e.stopPropagation()}
            >
                <header className="flex-shrink-0 px-4 pt-3.5 pb-2 bg-[#060608]">
                    <div className="flex justify-between items-center mb-1.5 relative text-center h-10">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2">
                            {canReorderCurrentTab && (
                                <button 
                                    onClick={() => setIsEditMode(!isEditMode)} 
                                    className="text-xs font-semibold text-gray-200 px-3.5 py-1.5 rounded-full bg-[#1A1A24] border border-gray-800 hover:bg-[#20202F] hover:text-white transition-all active:scale-95"
                                >
                                    {isEditMode ? t('gifts.done') : "Reordenar"}
                                </button>
                            )}
                        </div>
                        <h2 className="text-[15px] font-bold text-white mx-auto uppercase tracking-wide">{t('gifts.title')}</h2>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2">
                            <div className="flex flex-col items-center bg-black/40 border border-gray-800/65 rounded-xl overflow-hidden min-w-[100px] h-10 justify-between">
                                <div className="flex items-center justify-center space-x-1 px-2.5 pt-1">
                                    <YellowDiamondIcon className="w-3.5 h-3.5 text-yellow-500" />
                                    <span className="text-white font-black text-xs">{userDiamonds.toLocaleString('pt-BR')}</span>
                                </div>
                                <button 
                                    onClick={onRecharge} 
                                    className="w-full bg-[#FFD700] hover:bg-[#E6BE00] text-black font-black text-[9px] py-0.5 flex items-center justify-center space-x-0.5 transition-all text-center uppercase tracking-wide"
                                >
                                    <span>Recarregar</span>
                                    <span className="text-[7px]">▶</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <nav className="flex items-center space-x-5 border-b border-gray-950 overflow-x-auto no-scrollbar pt-1">
                        {giftCategories.map(tab => (
                            <button 
                                key={tab} 
                                onClick={() => handleTabChange(tab)} 
                                className={`text-[12px] font-bold transition-all relative py-2 shrink-0 ${activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-400'}`}
                                disabled={loadingCategories.has(tab)}
                            >
                                {loadingCategories.has(tab) ? '...' : tab}
                                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"></div>}
                            </button>
                        ))}
                    </nav>
                </header>
                <main className="flex-grow overflow-y-auto px-4 py-2 bg-[#060608] no-scrollbar">
                    {activeTab === 'Galeria' ? (
                        receivedGiftsData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center h-48 space-y-2">
                                <span className="text-3xl">🎁</span>
                                <p className="text-xs text-gray-500 font-semibold">Nenhum presente na galeria ainda.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2 pb-2">
                                {receivedGiftsData.map(gift => (
                                    <div key={gift.name} className="relative flex flex-col items-center justify-center space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                        <div className="w-12 h-12 flex items-center justify-center text-3xl">
                                            {renderGiftVisual(gift)}
                                        </div>
                                        <div className="h-6 w-full flex items-center justify-center px-0.5 overflow-hidden">
                                          <p className="text-[10px] text-gray-300 text-center truncate font-medium">{gift.name}</p>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-[10px] text-[#FFD700] font-black">x{(gift as any).count || 1}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className={`grid ${activeTab === 'Efeito' || activeTab === 'Entrada' ? 'grid-cols-3' : 'grid-cols-4'} gap-x-2 gap-y-3 pb-2`}>
                            {filteredGifts.map(gift => {
                                const isSelected = selectedGift?.name === gift.name && !isEditMode;

                                return (
                                <button 
                                    key={gift.name} 
                                    onClick={() => {
                                        if (isEditMode) return;
                                        handleSelectGift(gift);
                                    }}
                                    draggable={isEditMode}
                                    onDragStart={() => handleDragStart(gift)}
                                    onDragEnter={() => handleDragEnter(gift)}
                                    onDragEnd={handleDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                    className={`group relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all border outline-none ${isSelected ? 'border-[#FFD700] bg-[#FFD700]/5 shadow-[0_0_12px_rgba(255,215,0,0.15)] scale-[1.02]' : 'border-transparent bg-transparent hover:bg-white/[0.03]'} ${isEditMode ? 'cursor-move border-dashed border-purple-500/40 bg-purple-500/5' : ''}`}
                                >
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl transition-transform duration-200 group-hover:scale-105 active:scale-95">
                                        {renderGiftVisual(gift)}
                                    </div>
                                    <div className="w-full flex items-center justify-center px-0.5 mt-1 overflow-hidden">
                                        <p className="text-[11px] text-gray-300 text-center truncate font-medium group-hover:text-white transition-colors">{gift.name}</p>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <YellowDiamondIcon className="w-2.5 h-2.5 text-[#FFD700]" />
                                        <span className="text-[10px] text-gray-400 font-bold font-mono">{gift.price}</span>
                                    </div>
                                    {isSelected && (
                                        <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#FFD700] rounded-full flex items-center justify-center shadow-md animate-pulse">
                                            <svg className="w-2 h-2 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                                );
                            })}
                        </div>
                    )}
                </main>
                {isEditMode ? (
                     <div className="flex-shrink-0 p-4 border-t border-gray-950 bg-[#060608] text-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                        {t('gifts.dragToReorder')}
                    </div>
                ) : (
                    <footer className="flex-shrink-0 p-4 border-t border-gray-950 bg-[#060608] flex flex-col space-y-3">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col">
                                <div className="text-[11px] text-gray-400 mb-1.5 uppercase font-semibold tracking-wider">
                                    {isBroadcaster && !isAppOwner
                                        ? "Você não pode enviar presentes para si mesmo"
                                        : selectedGift ? `Enviar ${selectedGift.name} (Max: ${maxCanSend})` : "Selecione um presente"}
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    {presetQuantities.map((q) => (
                                        <button 
                                            key={q} 
                                            onClick={() => setQuantity(q)}
                                            className={`w-9 h-8 rounded-lg flex items-center justify-center transition-all border text-[11px] font-black ${quantity === q ? 'border-[#FFD700] text-[#FFD700] bg-[#FFD700]/15' : 'border-gray-800/80 text-gray-400 bg-black/40 hover:border-gray-700'}`}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button 
                                onClick={handleSend} 
                                disabled={(isBroadcaster && !isAppOwner) || !selectedGift || (selectedGift.price || 0) * quantity > userDiamonds || isSendingGift}
                                className="h-12 px-6 rounded-2xl bg-[#FFD700] hover:bg-[#E6BE00] disabled:bg-gray-800 disabled:text-gray-500 font-black text-black text-xs tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-[#FFD700]/5 min-w-[95px] shrink-0 font-sans"
                            >
                                {isSendingGift ? "..." : "Enviar"}
                            </button>
                        </div>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default GiftModal;
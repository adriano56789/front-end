
import React, { useState, useEffect } from 'react';
import { Gift, ToastType } from '../../types';
import { api } from '../../services/api';
import { LoadingSpinner } from '../Loading';
import { BackIcon } from '../icons';

interface GiftAdminPanelProps {
    onClose: () => void;
}

const GiftAdminPanel: React.FC<GiftAdminPanelProps> = ({ onClose }) => {
    const [gifts, setGifts] = useState<Gift[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [editUrls, setEditUrls] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        loadGifts();
    }, []);

    const loadGifts = async () => {
        setLoading(true);
        try {
            const data = await api.getGifts();
            setGifts(data);
        } catch (err) {
            console.error('[GiftAdmin] Erro ao carregar presentes:', err);
        }
        setLoading(false);
    };

    const startEdit = (gift: Gift) => {
        setEditingId(gift.id || gift.name);
        setEditUrls(prev => ({ ...prev, [gift.id || gift.name]: gift.animationUrl || '' }));
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveAnimationUrl = async (gift: Gift) => {
        const giftKey = gift.id || gift.name;
        const url = editUrls[giftKey]?.trim() || '';
        setSavingId(giftKey);
        try {
            const result = await api.updateGift(giftKey, { animationUrl: url });
            if (result) {
                setGifts(prev => prev.map(g =>
                    (g.id || g.name) === giftKey ? { ...g, animationUrl: url } : g
                ));
            }
        } catch (err) {
            console.error('[GiftAdmin] Erro ao salvar:', err);
        }
        setSavingId(null);
        setEditingId(null);
    };

    const removeAnimation = async (gift: Gift) => {
        const giftKey = gift.id || gift.name;
        setSavingId(giftKey);
        try {
            await api.updateGift(giftKey, { animationUrl: '' });
            setGifts(prev => prev.map(g =>
                (g.id || g.name) === giftKey ? { ...g, animationUrl: undefined } : g
            ));
        } catch (err) {
            console.error('[GiftAdmin] Erro ao remover animação:', err);
        }
        setSavingId(null);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center p-4 border-b border-gray-800">
                <button onClick={onClose} className="text-gray-400 hover:text-white mr-4">
                    <BackIcon className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-white">Gerenciar Presentes</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {gifts.map((gift) => {
                    const giftKey = gift.id || gift.name;
                    const isEditing = editingId === giftKey;
                    const isSaving = savingId === giftKey;

                    return (
                        <div key={giftKey} className="bg-[#1C1C1E] rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">{gift.icon}</span>
                                    <div>
                                        <p className="text-white font-medium">{gift.name}</p>
                                        <p className="text-gray-400 text-xs">{gift.category}</p>
                                    </div>
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={() => startEdit(gift)}
                                        className="text-blue-400 text-sm hover:text-blue-300"
                                    >
                                        Editar
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-2 mt-2">
                                    <label className="text-gray-400 text-xs">URL da Animação (WebM/MP4)</label>
                                    <input
                                        type="text"
                                        value={editUrls[giftKey] || ''}
                                        onChange={(e) => setEditUrls(prev => ({ ...prev, [giftKey]: e.target.value }))}
                                        placeholder="https://exemplo.com/animacoes/pirulito.webm"
                                        className="w-full bg-black text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 outline-none"
                                    />
                                    {gift.animationUrl && (
                                        <div className="mt-1">
                                            <video
                                                src={gift.animationUrl}
                                                muted
                                                loop
                                                autoPlay
                                                playsInline
                                                className="w-32 h-32 object-contain mix-blend-screen bg-black rounded-lg"
                                            />
                                        </div>
                                    )}
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => saveAnimationUrl(gift)}
                                            disabled={isSaving}
                                            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-500 disabled:opacity-50"
                                        >
                                            {isSaving ? 'Salvando...' : 'Salvar'}
                                        </button>
                                        {gift.animationUrl && (
                                            <button
                                                onClick={() => removeAnimation(gift)}
                                                disabled={isSaving}
                                                className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-500 disabled:opacity-50"
                                            >
                                                Remover
                                            </button>
                                        )}
                                        <button
                                            onClick={cancelEdit}
                                            className="text-gray-400 px-4 py-1.5 text-sm hover:text-white"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : gift.animationUrl ? (
                                <div className="mt-2 flex items-center space-x-2">
                                    <span className="text-green-400 text-xs">✓ Animação configurada</span>
                                    <button
                                        onClick={() => removeAnimation(gift)}
                                        disabled={isSaving}
                                        className="text-red-400 text-xs hover:text-red-300"
                                    >
                                        Remover
                                    </button>
                                </div>
                            ) : (
                                <p className="text-gray-600 text-xs mt-1">Sem animação configurada</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GiftAdminPanel;

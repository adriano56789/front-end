import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, ToastType } from '../types';
import { api } from '../services/api';
import { connectSocket, onSocketEvent } from '../services/socketService';

interface RouletteItem {
    _id: string;
    label: string;
    icon: string;
    color: string;
    textColor: string;
    ownerId: string;
    type: string;
    amount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// Cores automáticas para setores sem cor definida (estilo cassino, sem marca)
const AUTO_COLORS = ['#8b5cf6', '#f59e0b', '#7c3aed', '#06b6d4', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#eab308'];

interface RouletteModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    updateUser: (user: User) => void;
    addToast: (type: ToastType, message: string) => void;
    onOpenWallet?: (tab?: 'Diamante' | 'Ganhos') => void;
    // Dono da roleta (streamer cuja live está aberta) — os itens são DELE
    ownerId?: string;
    streamId?: string;
    // 🔒 SÓ o host edita os nomes da roleta; espectadores só veem e giram
    canEdit?: boolean;
}

export const RouletteModal: React.FC<RouletteModalProps> = ({
    isOpen,
    onClose,
    currentUser,
    updateUser,
    addToast,
    onOpenWallet,
    ownerId,
    streamId,
    canEdit = false
}) => {
    // Referência ESTÁVEL do addToast: a função muda de identidade a cada render
    // do pai e, se entrasse nos deps do loadItems, recarregaria a roleta em loop
    // (setLoading/setItems a cada render) — fazendo item recém-salvo "sumir".
    const addToastRef = useRef(addToast);
    addToastRef.current = addToast;

    // 🔁 Referência do loadItems para o listener de socket (evita re-registrar)
    const loadItemsRef = useRef<() => void>(() => {});
    const loadCostRef = useRef<() => void>(() => {});

    const [items, setItems] = useState<RouletteItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    // ✏️ Edição INLINE: clicou num setor da roleta → edita o NOME do setor
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const editInputRef = useRef<HTMLInputElement>(null);

    // 💎 Custo FIXO para girar — a host define quantos diamantes custa CADA
    // RODADA. Os nomes dos setores são 100% editáveis (dança, música, o que for).
    const [spinCost, setSpinCost] = useState<number>(0);
    const [spinCostInput, setSpinCostInput] = useState<string>('');
    // 🔒 Estado de carregamento: true até receber os dados REAIS do backend
    // (REST ou socket). Evita mostrar "0💎" antes de saber o valor correto.
    const [stateLoaded, setStateLoaded] = useState<boolean>(false);
    // ✏️ Edição INLINE do valor: clicou no "X💎 DIAMANTES PRA RODAR" → vira
    // input pra host digitar o novo valor e salvar.
    const [editingCostInline, setEditingCostInline] = useState(false);
    const costInputRef = useRef<HTMLInputElement>(null);
    // 🎹 Teclado móvel: altura escondida pelo teclado (visualViewport) — usada
    // para subir o widget e o input de diamantes ficar VISÍVEL acima do teclado.
    const [keyboardOffset, setKeyboardOffset] = useState(0);

    // 🎹 Detecta o teclado móvel (visualViewport encolhe) e sobe o widget na hora.
    useEffect(() => {
        const vv = (window as any).visualViewport as VisualViewport | undefined;
        if (!vv) return;
        const onResize = () => {
            const hidden = window.innerHeight - vv.height;
            setKeyboardOffset(hidden > 0 ? hidden : 0);
        };
        vv.addEventListener('resize', onResize);
        return () => vv.removeEventListener('resize', onResize);
    }, []);

    const [rotationDeg, setRotationDeg] = useState<number>(0);
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [winningPrize, setWinningPrize] = useState<RouletteItem | null>(null);
    const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Guard SÍNCRONO contra double-spin (state do React é assíncrono — dois
    // taps rápidos antes do re-render disparariam dois giros/débitos)
    const spinInFlightRef = useRef(false);

    // 🧹 Limpa o timer do giro ao desmontar
    useEffect(() => {
        return () => {
            if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
        };
    }, []);

    // 🎡 Carrega os itens CADASTRADOS do dono da live (via api.ts SEMPRE)
    const loadItems = useCallback(async () => {
        if (!ownerId) return;
        setLoading(true);
        try {
            const data = await api.roulette.getItems(ownerId);
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[ROULETTE] Erro ao carregar itens:', err);
            addToastRef.current(ToastType.Error, 'Falha ao carregar a roleta.');
        } finally {
            setLoading(false);
        }
    }, [ownerId]);
    loadItemsRef.current = loadItems;

    useEffect(() => {
        if (isOpen && ownerId) {
            setStateLoaded(false);
            loadItems();
            // 💎 Carrega o custo fixo definido pela host ("X DIAMANTES PRA RODAR").
            // Em caso de falha, NÃO seta stateLoaded(true) — mantém "Carregando..."
            // até o socket ou polling trazer o valor correto. Evita mostrar "0💎"
            // quando o host definiu um custo real.
            const fetchCost = (attempt: number) => {
                api.roulette.getSpinCost(ownerId).then((r) => {
                    if (r && typeof r.spinCost === 'number') {
                        setSpinCost(Math.max(0, r.spinCost));
                        setSpinCostInput(String(Math.max(0, r.spinCost)));
                        setStateLoaded(true);
                    } else if (attempt < 3) {
                        setTimeout(() => fetchCost(attempt + 1), 2000);
                    } else {
                        setStateLoaded(true);
                    }
                }).catch(() => {
                    if (attempt < 3) {
                        setTimeout(() => fetchCost(attempt + 1), 2000);
                    } else {
                        setStateLoaded(true);
                    }
                });
            };
            fetchCost(0);
        }
    }, [isOpen, ownerId, loadItems]);

    // 📡 TEMPO REAL: quando o HOST cadastra/edita/remove item ou muda o custo,
    // o backend emite `roulette_updated` na sala da live (io.to(ownerId)) e TODOS
    // os espectadores com a roleta aberta veem a mudança na hora — sem precisar
    // fechar/abrir ou recarregar. Só abre a tela de compra, nunca edita nada.
    useEffect(() => {
        if (!isOpen || !ownerId) return;
        let unsub: (() => void) | null = null;
        let cancelled = false;
        const syncFromEvent = (data: any) => {
            if (!data || cancelled) return;
            if (data.ownerId && String(data.ownerId) !== String(ownerId)) return;
            if (Array.isArray(data.items)) {
                setItems(data.items);
            } else {
                loadItemsRef.current();
            }
            if (typeof data.spinCost === 'number') {
                const fresh = Math.max(0, data.spinCost);
                setSpinCost(fresh);
                setSpinCostInput((prev) => (editingCostInline ? prev : String(fresh)));
            } else {
                loadCostRef.current();
            }
            // 📡 Marca estado como carregado quando recebido via socket
            setStateLoaded(true);
        };
        connectSocket().then((s) => {
            if (!cancelled && s?.connected) {
                unsub = onSocketEvent<any>('roulette_updated', syncFromEvent);
                // 🎡 Solicita o estado ATUAL da roleta ao abrir — garante que
                // espectadores vejam os mesmos itens e custo que o host definiu,
                // mesmo que o broadcast anterior tenha sido perdido.
                s.emit('request_roulette_state', { ownerId });
            }
        });
        return () => {
            cancelled = true;
            if (unsub) unsub();
        };
    }, [isOpen, ownerId, editingCostInline]);

    // 🎡 ROLETA GIRA NA SALA DA HOST: quando um espectador gira, o backend
    // emite roulette_spin para a sala (stream room + user_ownerId). O host
    // (e todos na sala) veem a roleta girar e parar no item sorteado.
    useEffect(() => {
        if (!isOpen || !ownerId) return;
        let cancelled = false;
        const handleRouletteSpin = (e: Event) => {
            const data = (e as CustomEvent).detail;
            if (!data || cancelled) return;
            // Ignorar spins da MESMA pessoa (já animou localmente via handleSpin)
            if (String(data.spinnerUserId) === String(currentUser.id)) return;
            // Só animar se o dono da roleta bate com o ownerId deste modal
            if (data.ownerId && String(data.ownerId) !== String(ownerId)) return;
            const spinItem = data.item;
            if (!spinItem) return;

            // 🔄 Garantir itens carregados antes de calcular o ângulo
            // NÃO usar displayItems (definido depois do early return) — usar
            // items (state) diretamente, com fallback para placeholders.
            const currentItems = items.length > 0 ? items : [
                { _id: 'placeholder', label: 'Dança', icon: '💃', color: '#f59e0b', textColor: '#1f2937', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
                { _id: 'placeholder2', label: 'Música', icon: '🎵', color: '#7c3aed', textColor: '#ffffff', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
                { _id: 'placeholder3', label: 'Cantar', icon: '🎤', color: '#06b6d4', textColor: '#ffffff', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
                { _id: 'placeholder4', label: 'Falar', icon: '🗣️', color: '#ef4444', textColor: '#ffffff', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
                { _id: 'placeholder5', label: 'Surpresa', icon: '✨', color: '#10b981', textColor: '#ffffff', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
                { _id: 'placeholder6', label: 'Sorte', icon: '🎁', color: '#8b5cf6', textColor: '#ffffff', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
            ];

            // Encontrar o índice do item sorteado
            const itemIndex = currentItems.findIndex(
                (it: RouletteItem) => String(it._id) === String(spinItem._id)
            );
            const safeIndex = itemIndex >= 0 ? itemIndex : Math.floor(Math.random() * currentItems.length);
            const sliceAngleNow = 360 / currentItems.length;
            const targetSliceAngle = safeIndex * sliceAngleNow + sliceAngleNow / 2;

            // Iniciar animação do giro
            setIsSpinning(true);
            setWinningPrize(null);
            setEditingItemId(null);
            setEditLabel('');

            // Calcular rotação final (mesma lógica do handleSpin)
            const extraTurns = 360 * 5;
            const finalRotation = rotationDeg + extraTurns + (360 - (rotationDeg % 360)) + (270 - targetSliceAngle);
            setRotationDeg(finalRotation);

            // ⏱️ Após a animação (3.6s), mostrar o resultado e notificação
            spinTimerRef.current = setTimeout(() => {
                spinTimerRef.current = null;
                setIsSpinning(false);
                setWinningPrize(spinItem);
                const spinnerName = data.spinnerName || 'Um espectador';
                addToastRef.current(
                    ToastType.Success,
                    `${spinnerName} girou a roleta e ganhou: ${spinItem.label}! 🎉`
                );
            }, 3600);
        };
        window.addEventListener('livego:roulette_spin', handleRouletteSpin);
        return () => {
            cancelled = true;
            window.removeEventListener('livego:roulette_spin', handleRouletteSpin);
        };
    }, [isOpen, ownerId, items, currentUser?.id, rotationDeg]);

    // 🔁 Mantém o custo SEMPRE igual ao valor salvo pela host: se a host mudar
    // o preço com a roleta aberta, o valor exibido atualiza sozinho (assim o
    // que o espectador vê é exatamente o que o backend vai debitar). Não
    // sobrescreve o input enquanto o host estiver digitando.
    useEffect(() => {
        if (!isOpen || !ownerId) return;
        const t = setInterval(() => {
            api.roulette.getSpinCost(ownerId).then((r) => {
                if (!r || typeof r.spinCost !== 'number') return;
                const fresh = Math.max(0, r.spinCost);
                setSpinCost(fresh);
                setSpinCostInput((prev) => (editingCostInline ? prev : String(fresh)));
                setStateLoaded(true);
            }).catch(() => {
                // ⚠️ Não silenciar completamente: se o REST falhar repetidamente,
                // o socket já deveria ter entregado o estado. Não mexer no stateLoaded
                // para não causar flicker entre "Carregando..." e "0💎".
            });
        }, 8000);
        return () => clearInterval(t);
    }, [isOpen, ownerId, editingCostInline]);

    // 📡 SALDO EM TEMPO REAL: quando o backend emite `diamonds_updated`
    // (após giro, presente, compra), atualiza o saldo do espectador na hora.
    // Escuta o CustomEvent global disparado por useStreamChat.ts.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;
            // 🔧 O backend pode enviar { diamonds } ou { diamonds, earnings }
            if (typeof detail.diamonds === 'number') {
                updateUser({ ...currentUser, diamonds: detail.diamonds });
            }
        };
        window.addEventListener('livego:diamonds_updated', handler);
        return () => window.removeEventListener('livego:diamonds_updated', handler);
    }, [isOpen, currentUser?.id]);

    loadCostRef.current = () => {
        if (!ownerId) return;
        api.roulette.getSpinCost(ownerId).then((r) => {
            if (!r || typeof r.spinCost !== 'number') return;
            const fresh = Math.max(0, r.spinCost);
            setSpinCost(fresh);
            setSpinCostInput((prev) => (editingCostInline ? prev : String(fresh)));
            setStateLoaded(true);
        }).catch(() => { });
    };
    // Foca o input de edição quando um setor é selecionado
    useEffect(() => {
        if (editingItemId) editInputRef.current?.focus();
    }, [editingItemId]);

    // Foca o input do valor quando o host clica no "X💎 DIAMANTES PRA RODAR"
    useEffect(() => {
        if (editingCostInline) {
            costInputRef.current?.focus();
            // 🎹 Rola o input para o CENTRO do widget — o teclado abre em ~300ms
            // e, sem isso, cobre o campo e não dá pra digitar.
            setTimeout(() => {
                costInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 350);
        }
    }, [editingCostInline]);

    // ⏱️ Modal de resultado do prêmio fecha SOZINHO depois de ~3s (não fica
    // travando a roleta)
    useEffect(() => {
        if (!winningPrize) return;
        const t = setTimeout(() => setWinningPrize(null), 3000);
        return () => clearTimeout(t);
    }, [winningPrize]);

    // Salvar novo item (via api.ts) — SÓ o host
    const handleSaveItem = async () => {
        if (!canEdit) return;
        const label = newLabel.trim();
        if (!label || !ownerId) return;
        try {
            const created = await api.roulette.createItem({
                ownerId,
                label,
                icon: '🎁',
                color: AUTO_COLORS[items.length % AUTO_COLORS.length],
                textColor: '#ffffff',
                type: 'action',
                amount: 0,
            });
            if (created && created._id) {
                setItems(prev => [...prev, created]);
                setNewLabel('');
                addToast(ToastType.Success, `"${label}" salvo na roleta!`);
            } else {
                addToast(ToastType.Error, 'Falha ao salvar o item.');
            }
        } catch (err) {
            console.error('[ROULETTE] Erro ao salvar item:', err);
            addToast(ToastType.Error, 'Falha ao salvar o item.');
        }
    };

    // Remover item (via api.ts) — SÓ o host
    const handleDeleteItem = async (id: string) => {
        if (!canEdit) return;
        try {
            await api.roulette.deleteItem(id);
            setItems(prev => prev.filter(it => it._id !== id));
            addToast(ToastType.Info, 'Item removido da roleta.');
        } catch (err) {
            console.error('[ROULETTE] Erro ao remover item:', err);
            addToast(ToastType.Error, 'Falha ao remover o item.');
        }
    };

    // ✏️ Clique num SETOR da roleta → abre edição inline do NOME do setor
    // (só funciona para o HOST — espectador não edita)
    const handleSectorClick = (it: RouletteItem) => {
        if (!canEdit) return;
        if (isSpinning || spinInFlightRef.current) return;
        if (String(it._id).startsWith('placeholder')) {
            // Roleta vazia (setores de exemplo): abre o formulário para cadastrar
            setEditing(true);
            return;
        }
        setEditingItemId(it._id);
        setEditLabel(it.label);
    };

    // ✏️ Salvar a edição do NOME do setor (via api.ts SEMPRE) — SÓ o host
    const handleSaveEdit = async () => {
        if (!canEdit) return;
        const label = editLabel.trim();
        if (!label || !editingItemId) return;
        setSavingEdit(true);
        try {
            const updated = await api.roulette.updateItem(editingItemId, {
                label,
            });
            if (updated && updated._id) {
                setItems(prev => prev.map(it => it._id === editingItemId ? updated : it));
                setEditingItemId(null);
                setEditLabel('');
                addToast(ToastType.Success, `Setor atualizado: "${label}"!`);
            } else {
                addToast(ToastType.Error, 'Falha ao atualizar o setor.');
            }
        } catch (err) {
            console.error('[ROULETTE] Erro ao atualizar setor:', err);
            addToast(ToastType.Error, 'Falha ao atualizar o setor.');
        } finally {
            setSavingEdit(false);
        }
    };

    // 💎 Salvar o custo FIXO do giro (via api.ts) — SÓ o host. O valor é salvo
    // ao tocar OK/Enter (ou ao sair do campo). Sem valor alterado → não chama a API.
    const handleSaveSpinCost = async () => {
        if (!canEdit || !ownerId) return;
        const cost = Math.max(0, Math.floor(parseInt(spinCostInput) || 0));
        if (cost === spinCost) {
            setSpinCostInput(String(cost));
            return;
        }
        try {
            const r = await api.roulette.setSpinCost(ownerId, cost);
            if (r && typeof r.spinCost === 'number') {
                setSpinCost(r.spinCost);
                setSpinCostInput(String(r.spinCost));
                addToast(ToastType.Success, `${r.spinCost} 💎 definidos para girar!`);
            } else {
                addToast(ToastType.Error, 'Falha ao salvar o custo do giro.');
            }
        } catch (err) {
            console.error('[ROULETTE] Erro ao salvar custo:', err);
            addToast(ToastType.Error, 'Falha ao salvar o custo do giro.');
        }
    };

    // 🔓 O DONO PODE GIRAR pra testar e conferir que os diamantes caem certinho.
    // Espectadores giram normalmente. A edição (itens/custo) continua só pro dono.
    const isHost = canEdit;

    // 🎯 GIRAR — o backend sorteia entre os itens CADASTRADOS e retorna exatamente
    // o que a pessoa cadastrou (dança, música, qualquer ação). O CUSTO É SEMPRE O
    // VALOR FIXO definido pela host (spinCost). Passa SEMPRE pelo api.ts.
    const handleSpin = async () => {
        if (isSpinning || spinInFlightRef.current) return;

        // 📡 Espera o estado ser carregado antes de permitir giro
        if (!stateLoaded) {
            addToast(ToastType.Info, 'Carregando dados da roleta...');
            return;
        }

        const currentDiamonds = currentUser.diamonds || 0;
        // 💎 Sem saldo suficiente pro custo fixo → abre a MESMA carteira dos
        // presentes (WalletScreen local). Giro grátis (custo 0) libera direto.
        if (spinCost > 0 && currentDiamonds < spinCost) {
            addToast(ToastType.Error, `Você precisa de ${spinCost} 💎 para girar! Recarregue na carteira.`);
            if (onOpenWallet) onOpenWallet('Diamante');
            return;
        }
        if (!ownerId) {
            addToast(ToastType.Error, 'Roleta indisponível nesta transmissão.');
            return;
        }
        if (!items || items.length === 0) {
            addToast(ToastType.Error, 'A roleta ainda não tem itens. Cadastre antes de girar.');
            if (canEdit) setEditing(true);
            return;
        }

        spinInFlightRef.current = true;
        setIsSpinning(true);
        setWinningPrize(null);
        // Fecha o painel de edição ao girar
        setEditingItemId(null);
        setEditLabel('');

        // 💎 DESCONTO OTIMISTA: deduzir imediatamente o custo do saldo local
        // para o espectador ver os diamantes CAINDO em tempo real (antes da
        // resposta da API). Se a API falhar, revertemos.
        const costForOptimistic = costToSpin || spinCost || 0;
        if (costForOptimistic > 0) {
            const optimisticDiamonds = Math.max(0, (currentUser.diamonds || 0) - costForOptimistic);
            updateUser({ ...currentUser, diamonds: optimisticDiamonds });
        }

        try {
            // Sorteio FEITO NO BACKEND (fonte da verdade) — cobra o custo FIXO
            // definido pela host. Backend rejeita com 400 se o saldo for insuficiente.
            // O custo exibido na roleta (costToSpin) é enviado junto pro backend
            // confirmar que é exatamente o valor salvo pela host.
            const result = await api.roulette.spin({
                userId: currentUser.id,
                streamId: streamId || '',
                ownerId,
                cost: costToSpin,
            });

            if (!result || !result.success || !result.item) {
                // ⏪ REVERT: API falhou — devolver o saldo original
                updateUser({ ...currentUser, diamonds: currentUser.diamonds });
                setIsSpinning(false);
                spinInFlightRef.current = false;
                addToast(ToastType.Error, 'Falha ao girar a roleta. Tente novamente.');
                return;
            }

            const prize = result.item;
            // 🔧 RECONCILIAR: usar o saldo confirmado pelo backend (banco de dados)
            // como fonte da verdade — NUNCA confiar no valor local.
            if (typeof result.diamondsAfter === 'number' && result.diamondsAfter >= 0) {
                updateUser({ ...currentUser, diamonds: result.diamondsAfter });
            }
            // 💎 Sincroniza o custo exibido com o valor EXATAMENTE debitado pelo
            // backend (result.cost) — display == host definiu == saldo descontado.
            if (typeof result.cost === 'number' && Number.isFinite(result.cost)) {
                const charged = Math.max(0, result.cost);
                setSpinCost(charged);
                setSpinCostInput(String(charged));
            }

            // Alinhar o setor do item sorteado com a agulha (no topo, 270°)
            const itemIndex = items.findIndex(it => String(it._id) === String(prize._id));
            const safeIndex = itemIndex >= 0 ? itemIndex : Math.floor(Math.random() * items.length);
            const sliceAngleNow = 360 / items.length;
            const targetSliceAngle = safeIndex * sliceAngleNow + sliceAngleNow / 2;

            const extraTurns = 360 * 5;
            const finalRotation = rotationDeg + extraTurns + (360 - (rotationDeg % 360)) + (270 - targetSliceAngle);
            setRotationDeg(finalRotation);

            spinTimerRef.current = setTimeout(() => {
                spinTimerRef.current = null;
                setIsSpinning(false);
                spinInFlightRef.current = false;
                setWinningPrize(prize);
                addToast(ToastType.Success, `🎉 Parabéns! Você ganhou: ${prize.label}!`);
            }, 3600);
        } catch (err: any) {
            console.error('[ROULETTE] Erro ao girar:', err);
            setIsSpinning(false);
            spinInFlightRef.current = false;
            // ⏪ REVERT: devolver o saldo ORIGINAL do banco (via api.ts) se a
            // API falhar — NUNCA confiar no valor local, sempre buscar fresco.
            try {
                const freshUser = await api.getUser(currentUser.id);
                if (freshUser && typeof freshUser.diamonds === 'number') {
                    updateUser({ ...currentUser, diamonds: freshUser.diamonds });
                }
            } catch { /* falha silenciosa — saldo continua do optimistic revert */ }
            // 💎 Saldo insuficiente confirmado pelo backend → abre a MESMA carteira dos presentes
            const msg = String(err?.message || '');
            if (/insuficiente|diamantes/i.test(msg)) {
                addToast(ToastType.Error, 'Diamantes insuficientes! Recarregue na carteira para girar.');
                if (onOpenWallet) onOpenWallet('Diamante');
                return;
            }
            addToast(ToastType.Error, 'Falha ao girar a roleta. Tente novamente.');
        }
    };

    if (!isOpen) return null;

    const displayItems = items.length > 0 ? items : [
        { _id: 'placeholder', label: 'Cadastre itens', icon: '🎁', color: '#8b5cf6', textColor: '#ffffff', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
        { _id: 'placeholder2', label: 'Dança', icon: '💃', color: '#f59e0b', textColor: '#1f2937', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
        { _id: 'placeholder3', label: 'Música', icon: '🎵', color: '#7c3aed', textColor: '#ffffff', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
        { _id: 'placeholder4', label: 'Cantar', icon: '🎤', color: '#06b6d4', textColor: '#ffffff', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
        { _id: 'placeholder5', label: 'Falar', icon: '🗣️', color: '#ef4444', textColor: '#ffffff', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
        { _id: 'placeholder6', label: 'Surpresa', icon: '✨', color: '#10b981', textColor: '#ffffff', ownerId: '', type: 'action', amount: 0, isActive: true, createdAt: '', updatedAt: '' },
    ];
    const sliceAngle = 360 / displayItems.length;
    // 💎 Custo para rodar = valor FIXO definido pela host ("X DIAMANTES PRA RODAR").
    // NUNCA mostra saldo do usuário — quem paga e gira são os espectadores.
    // Enquanto a host DIGITA o valor, ele já aparece na roleta na hora (sem
    // precisar salvar); quem assiste vê o valor salvo.
    const typedCost = Math.max(0, Math.floor(parseInt(spinCostInput) || 0));
    const costToSpin = (editing && spinCostInput !== '') ? typedCost : (spinCost || 0);
    // 📡 Mostra "Carregando..." até receber os dados reais do backend (REST/socket).
    // Evita mostrar "0💎" para espectadores antes do estado ser sincronizado.
    const displayCost = stateLoaded ? costToSpin : null;

    // Widget da roleta — fica FIXO direto na tela da live, BEM CENTRALIZADO
    // no meio da tela. NÃO é uma janela/modal: sem fundo, sem tela extra.
    // O overlay inset-0 usa pointer-events-none pra não bloquear os toques
    // na live; só o widget em si é clicável (pointer-events-auto).
    return (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-[12vh] text-white animate-fade-in select-none pointer-events-none">
            <div
                className="relative w-[290px] flex flex-col items-center justify-center text-white max-h-[85vh] overflow-y-auto no-scrollbar py-2 pointer-events-auto"
                style={keyboardOffset > 0 ? { transform: `translateY(${-keyboardOffset}px)`, transition: 'transform 0.15s ease' } : undefined}
            >
                {/* Header Actions — só título + fechar (sem minimizar) */}
                <div className="w-full flex items-center justify-between z-10 mb-1 px-1">
                    <div className="flex items-center space-x-2 bg-purple-900/60 border border-purple-500/40 px-3 py-1 rounded-full backdrop-blur-sm">
                        <span className="text-amber-400 font-black text-xs tracking-wider uppercase">Roleta</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center backdrop-blur-sm active:scale-90 transition-all cursor-pointer border border-white/20"
                        title="Esconder roleta"
                    >
                        ✕
                    </button>
                </div>

                {/* Editable items bar */}
                <div className="w-full mt-2 mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 bg-black/50 border border-white/10 px-3 py-1.5 rounded-full">
                        <span className="text-[10px] font-bold text-gray-300">{items.length} itens</span>
                        {loading && <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setEditing(v => !v)}
                            className="text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition-colors cursor-pointer"
                        >
                            {editing ? 'Concluir' : '✏️ Editar'}
                        </button>
                    )}
                </div>

                {/* ✏️ Modo editar: SÓ um campo para CADASTRAR nome novo direto na
                    roleta (sem painel/tela extra). Pra mudar nome existente, clica
                    no próprio setor na roleta. O valor é editado clicando no valor. */}
                {editing && canEdit && (
                    <div className="w-full mb-2 flex items-center gap-2 bg-black/50 border border-amber-400/30 rounded-2xl p-2 animate-fade-in">
                        <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveItem(); }}
                            placeholder="Novo nome (dança, música...)"
                            maxLength={60}
                            autoFocus
                            className="flex-1 min-w-0 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                        <button
                            onClick={handleSaveItem}
                            disabled={!newLabel.trim()}
                            className="shrink-0 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-purple-950 font-black text-sm disabled:opacity-40 cursor-pointer transition-transform active:scale-95"
                        >
                            OK
                        </button>
                    </div>
                )}

                {/* Dica: clicar num setor edita o nome (só host) */}
                {canEdit && !editingItemId && items.length > 0 && (
                    <p className="text-[10px] text-gray-400 font-semibold tracking-wide mb-0.5">
                        💡 Toque num setor da roleta para editar o nome
                    </p>
                )}

                {/* Main Wheel Wrapper */}
                <div className="relative w-[260px] h-[260px] flex items-center justify-center my-3">
                    <div className="absolute inset-0 rounded-full p-3 bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-700 shadow-[0_0_35px_rgba(245,158,11,0.5)] border-2 border-amber-200 flex items-center justify-center">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-2 h-2 rounded-full bg-amber-200 border border-amber-500 shadow-[0_0_6px_#fde047]"
                                style={{ transform: `rotate(${i * 30}deg) translate(0, -132px)` }}
                            />
                        ))}
                    </div>

                    {/* Pointer / Needle at Top Center */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                        <svg width="32" height="38" viewBox="0 0 32 38" fill="none">
                            <path d="M16 38L32 0H0L16 38Z" fill="url(#needleGrad)" />
                            <path d="M16 32L26 4H6L16 32Z" fill="#FEE140" />
                            <defs>
                                <linearGradient id="needleGrad" x1="16" y1="0" x2="16" y2="38" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#FFF5C0" />
                                    <stop offset="0.5" stopColor="#F59E0B" />
                                    <stop offset="1" stopColor="#78350F" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>

                    {/* Rotating Wheel Container */}
                    <div
                        className="w-[235px] h-[235px] rounded-full relative overflow-hidden border-4 border-amber-300 shadow-inner"
                        style={{
                            transform: `rotate(${rotationDeg}deg)`,
                            transition: isSpinning ? 'transform 3.5s cubic-bezier(0.15, 0.85, 0.20, 1.00)' : 'none'
                        }}
                    >
                        <svg viewBox="0 0 200 200" className="w-full h-full">
                            {displayItems.map((it, index) => {
                                const startAngle = index * sliceAngle;
                                const endAngle = startAngle + sliceAngle;
                                const x1 = 100 + 100 * Math.cos((Math.PI * startAngle) / 180);
                                const y1 = 100 + 100 * Math.sin((Math.PI * startAngle) / 180);
                                const x2 = 100 + 100 * Math.cos((Math.PI * endAngle) / 180);
                                const y2 = 100 + 100 * Math.sin((Math.PI * endAngle) / 180);
                                return (
                                    <g key={it._id + index}>
                                        <path
                                            d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`}
                                            fill={it.color}
                                            stroke="#fde047"
                                            strokeWidth="1.5"
                                            className={canEdit ? 'cursor-pointer transition-opacity hover:opacity-70' : undefined}
                                            onClick={canEdit ? () => handleSectorClick(it) : undefined}
                                        />
                                    </g>
                                );
                            })}
                        </svg>

                        {displayItems.map((it, index) => {
                            const angle = index * sliceAngle + sliceAngle / 2;
                            const rad = (angle * Math.PI) / 180;
                            const radius = 35;
                            const x = 50 + radius * Math.cos(rad);
                            const y = 50 + radius * Math.sin(rad);
                            const labelLimit = Math.max(3, Math.floor(300 / (displayItems.length * 1.6)));
                            return (
                                <div
                                    key={`label-${it._id}`}
                                    onClick={canEdit ? () => handleSectorClick(it) : undefined}
                                    className={`absolute flex flex-col items-center justify-center text-center font-bold ${canEdit ? 'cursor-pointer' : 'pointer-events-none'}`}
                                    style={{
                                        left: `${x}%`,
                                        top: `${y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        color: it.textColor,
                                        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                                    }}
                                >
                                    <span className="text-base mb-0.5">{it.icon || '🎁'}</span>
                                    <span
                                        className="font-black uppercase leading-tight tracking-wider px-1"
                                        style={{ fontSize: `${Math.min(11, labelLimit)}px` }}
                                    >
                                        {it.label.length > 12 ? it.label.slice(0, 12) + '…' : it.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Center GO Button */}
                    <button
                        onClick={handleSpin}
                        disabled={isSpinning}
                        className="absolute z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 p-1 shadow-[0_0_25px_rgba(245,158,11,0.8)] border-2 border-amber-200 hover:scale-105 active:scale-95 disabled:opacity-80 transition-all cursor-pointer flex flex-col items-center justify-center text-purple-950 font-black"
                    >
                        <div className="w-full h-full rounded-full bg-gradient-to-b from-purple-900 via-purple-950 to-purple-900 flex flex-col items-center justify-center border border-amber-300/60 shadow-inner">
                            <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                GO
                            </span>
                            {!stateLoaded ? (
                                <div className="flex flex-col items-center justify-center mt-0.5 bg-black/60 px-2 py-0.5 rounded-full border border-amber-400/50">
                                    <span className="text-[8px] font-black text-amber-300 leading-tight whitespace-nowrap">...</span>
                                    <span className="text-[8px] font-black text-amber-300 leading-tight whitespace-nowrap">CARREGANDO</span>
                                </div>
                            ) : Number(displayCost) > 0 && (
                                <div className="flex flex-col items-center justify-center mt-0.5 bg-black/60 px-2 py-0.5 rounded-full border border-amber-400/50">
                                    <span className="text-[8px] font-black text-amber-300 leading-tight whitespace-nowrap">{displayCost}💎</span>
                                    <span className="text-[8px] font-black text-amber-300 leading-tight whitespace-nowrap">PRA RODAR</span>
                                </div>
                            )}
                        </div>
                    </button>
                </div>

                {/* ✏️ Painel de edição inline do setor clicado */}
                {editingItemId && (
                    <div className="w-full bg-black/60 border border-amber-400/40 rounded-2xl p-3 mb-2 animate-fade-in">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-300 mb-2">
                            ✏️ Editando o nome deste setor
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <input
                                ref={editInputRef}
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit();
                                    if (e.key === 'Escape') { setEditingItemId(null); setEditLabel(''); }
                                }}
                                placeholder="Novo nome (dança, música...)"
                                maxLength={60}
                                className="flex-1 min-w-[140px] bg-white/10 border border-white/15 rounded-full px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit || !editLabel.trim()}
                                className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-purple-950 font-black text-sm disabled:opacity-40 cursor-pointer transition-transform active:scale-95"
                            >
                                {savingEdit ? '...' : 'Salvar'}
                            </button>
                            <button
                                onClick={() => { setEditingItemId(null); setEditLabel(''); }}
                                className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold cursor-pointer transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom Control Bar */}
                <div className="w-full flex flex-col items-center space-y-3 mt-2">
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-900/90 via-purple-950/90 to-purple-900/90 px-4 py-1.5 rounded-full border border-amber-400/40 shadow-lg backdrop-blur-md">
                        {canEdit && editingCostInline ? (
                            <input
                                ref={costInputRef}
                                type="number"
                                min={0}
                                value={spinCostInput}
                                onChange={(e) => setSpinCostInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { handleSaveSpinCost(); setEditingCostInline(false); }
                                    if (e.key === 'Escape') { setEditingCostInline(false); setSpinCostInput(String(spinCost)); }
                                }}
                                onBlur={() => { handleSaveSpinCost(); setEditingCostInline(false); }}
                                placeholder="0"
                                className="w-24 bg-white/10 border border-amber-400/50 rounded-full px-3 py-1 text-xs font-black text-amber-300 text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                        ) : (
                            <button
                                onClick={canEdit ? () => { setSpinCostInput(String(spinCost)); setEditingCostInline(true); } : undefined}
                                disabled={!canEdit}
                                title={canEdit ? 'Clique no valor para editar' : undefined}
                                className={`text-xs font-black text-amber-300 whitespace-nowrap ${canEdit ? 'cursor-pointer underline decoration-dotted underline-offset-4 hover:text-amber-200' : ''}`}
                            >
                                {!stateLoaded
                                    ? 'Carregando...'
                                    : Number(displayCost) > 0 ? `${displayCost}💎 DIAMANTES PRA RODAR` : '0💎 DIAMANTES PRA RODAR'
                                }
                            </button>
                        )}
                    </div>

                    <div className="bg-amber-950/40 border border-amber-500/30 px-4 py-2 rounded-2xl text-center backdrop-blur-sm max-w-xs">
                        <p className="text-xs text-amber-200 font-medium leading-relaxed">
                            {!stateLoaded
                                ? 'Carregando dados da roleta...'
                                : isHost
                                    ? `Cada rodada custa ${Number(displayCost) > 0 ? displayCost : 0} 💎 (definido por você). Você pode girar pra testar.`
                                    : `Cada rodada custa ${Number(displayCost) > 0 ? displayCost : 0} 💎 (definido pela host). Ao girar, esses diamantes vão direto para a host da live.`
                            }
                        </p>
                    </div>

                    <button
                        onClick={handleSpin}
                        disabled={isSpinning}
                        className="w-full max-w-xs py-3 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-purple-950 font-black text-base uppercase tracking-wider shadow-[0_4px_20px_rgba(245,158,11,0.5)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        {isSpinning ? 'Girando...' : 'Girar Roleta'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default RouletteModal;

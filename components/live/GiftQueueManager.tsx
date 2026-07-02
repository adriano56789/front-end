import React, { useState, useEffect, useRef } from 'react';
import GiftAnimationOverlay, { GiftPayload } from './GiftAnimationOverlay';

interface QueuedGift extends GiftPayload {
    id: number;
    priority: number;
    queueTime: number;
}

interface GiftQueueManagerProps {
    gifts: GiftPayload[];
    onAnimationEnd: (id: number) => void;
    maxConcurrent?: number;
    maxQueueSize?: number;
}

const GiftQueueManager: React.FC<GiftQueueManagerProps> = ({
    gifts,
    onAnimationEnd,
    maxConcurrent = 3,
    maxQueueSize = 50
}) => {
    const [activeGifts, _setActiveGifts] = useState<QueuedGift[]>([]);
    const [queue, _setQueue] = useState<QueuedGift[]>([]);

    // ⚡ Synchronous Refs to prevent stale-closure / async update race conditions
    const activeGiftsRef = useRef<QueuedGift[]>([]);
    const queueRef = useRef<QueuedGift[]>([]);

    const setActiveGifts = (val: QueuedGift[] | ((prev: QueuedGift[]) => QueuedGift[])) => {
        if (typeof val === 'function') {
            _setActiveGifts(prev => {
                const res = val(prev);
                activeGiftsRef.current = res;
                return res;
            });
        } else {
            _setActiveGifts(val);
            activeGiftsRef.current = val;
        }
    };

    const setQueue = (val: QueuedGift[] | ((prev: QueuedGift[]) => QueuedGift[])) => {
        if (typeof val === 'function') {
            _setQueue(prev => {
                const res = val(prev);
                queueRef.current = res;
                return res;
            });
        } else {
            _setQueue(val);
            queueRef.current = val;
        }
    };

    // 🛡️ Track IDs we've already started showing to prevent re-runs
    const processedIdsRef = useRef<Set<number>>(new Set());

    const calculatePriority = (gift: GiftPayload): number => {
        const value = (gift.gift.price || 0) * (gift.quantity || 1);
        if (value >= 1000) return 1; // Ultra VIP / Luxury
        if (value >= 500) return 2;  // High value
        if (value >= 100) return 3;  // Medium value
        return 5;                    // Low value / standard
    };

    // 1. Monitor incoming gifts with Fast Coalescing (Combo optimization)
    useEffect(() => {
        if (!gifts || gifts.length === 0) return;

        const newToProcess: QueuedGift[] = [];

        gifts.forEach(g => {
            const id = typeof g.id === 'number' ? g.id : Date.now() + Math.random();
            if (!processedIdsRef.current.has(id)) {
                processedIdsRef.current.add(id);

                // ⚡ CORE COALESCING: Check if a banner from the same sender for the same gift is already active
                const activeIdx = activeGiftsRef.current.findIndex(item => 
                    item.fromUser.id === g.fromUser.id && 
                    item.gift.name === g.gift.name
                );

                if (activeIdx !== -1) {
                    setActiveGifts(prev => {
                        const updated = [...prev];
                        if (updated[activeIdx]) {
                            updated[activeIdx] = {
                                ...updated[activeIdx],
                                quantity: updated[activeIdx].quantity + (g.quantity || 1)
                            };
                        }
                        return updated;
                    });
                    console.log(`[GiftCoalescing] Merged +x${g.quantity || 1} for ${g.gift.name} into existing active banner.`);
                    return; // Prevent duplicate banner creation
                }

                // ⚡ CORE COALESCING: Check if it's already in the waiting queue, merge there
                const queueIdx = queueRef.current.findIndex(item => 
                    item.fromUser.id === g.fromUser.id && 
                    item.gift.name === g.gift.name
                );

                if (queueIdx !== -1) {
                    setQueue(prev => {
                        const updated = [...prev];
                        if (updated[queueIdx]) {
                            updated[queueIdx] = {
                                ...updated[queueIdx],
                                quantity: updated[queueIdx].quantity + (g.quantity || 1)
                            };
                        }
                        return updated;
                    });
                    console.log(`[GiftCoalescing] Merged +x${g.quantity || 1} for ${g.gift.name} in wait queue.`);
                    return; // Prevent adding redundant item to queue
                }

                // ⚡ PRIORITY PREEMPTION & BUDGETING:
                // If it fits into priority tiers, we prepare it
                newToProcess.push({
                    ...g,
                    id,
                    priority: calculatePriority(g),
                    queueTime: Date.now()
                });
            }
        });

        if (newToProcess.length > 0) {
            setQueue(prev => {
                const merged = [...prev, ...newToProcess];
                
                // Keep the queue size within boundaries
                let processedQueue = merged.sort((a, b) => a.priority - b.priority || a.queueTime - b.queueTime);
                
                // If the queue size is extremely large (frenzy flood), auto-drop old priority-5 low-value items
                if (processedQueue.length > maxQueueSize) {
                    processedQueue = processedQueue.filter((item, index) => {
                        // Keep VIPs and high value, drop cheap ones if overflow limit reached
                        return item.priority < 5 || index >= (processedQueue.length - maxQueueSize);
                    });
                }
                
                return processedQueue.slice(-maxQueueSize);
            });
        }
    }, [gifts, maxQueueSize]);

    // 2. Consume from queue to activeGifts
    useEffect(() => {
        if (activeGifts.length < maxConcurrent && queue.length > 0) {
            const next = queue[0];
            const remaining = queue.slice(1);

            setQueue(remaining);
            setActiveGifts(prev => [...prev, next]);
        }
    }, [activeGifts.length, queue, maxConcurrent]);

    const handleAnimationEnd = (giftId: number) => {
        // 🔥 Remove from active list immediately
        setActiveGifts(prev => prev.filter(g => g.id !== giftId));
        // 🔔 Notify StreamRoom parent to clear from its queue
        onAnimationEnd(giftId);
    };

    return (
        <div className="gift-queue-container flex flex-col-reverse items-start space-y-reverse space-y-2 pointer-events-none">
            {activeGifts.map(gift => (
                <GiftAnimationOverlay
                    key={`gift-anim-${gift.id}`}
                    giftPayload={gift}
                    onAnimationEnd={handleAnimationEnd}
                />
            ))}
        </div>
    );
};

export default GiftQueueManager;

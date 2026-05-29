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
    const [activeGifts, setActiveGifts] = useState<QueuedGift[]>([]);
    const [queue, setQueue] = useState<QueuedGift[]>([]);

    // 🛡️ Track IDs we've already started showing to prevent re-runs
    const processedIdsRef = useRef<Set<number>>(new Set());

    const calculatePriority = (gift: GiftPayload): number => {
        const value = (gift.gift.price || 0) * (gift.quantity || 1);
        if (value >= 1000) return 1;
        if (value >= 500) return 2;
        if (value >= 100) return 3;
        return 5;
    };

    // 1. Monitor incoming gifts prop
    useEffect(() => {
        if (!gifts || gifts.length === 0) return;

        const newToProcess: QueuedGift[] = [];

        gifts.forEach(g => {
            const id = typeof g.id === 'number' ? g.id : Date.now() + Math.random();
            if (!processedIdsRef.current.has(id)) {
                processedIdsRef.current.add(id);
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
                return merged
                    .sort((a, b) => a.priority - b.priority || a.queueTime - b.queueTime)
                    .slice(-maxQueueSize);
            });
        }
    }, [gifts, maxQueueSize]);

    // 2. Move from queue to activeGifts
    useEffect(() => {
        if (activeGifts.length < maxConcurrent && queue.length > 0) {
            const next = queue[0];
            const remaining = queue.slice(1);

            setQueue(remaining);
            setActiveGifts(prev => [...prev, next]);
        }
    }, [activeGifts.length, queue, maxConcurrent]);

    const handleAnimationEnd = (giftId: number) => {
        // 🔥 Remove from visual list immediately
        setActiveGifts(prev => prev.filter(g => g.id !== giftId));
        // 🔔 Notify parent to clear from its giftQueue
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

/**
 * GiftCacheService
 * High-performance browser-side Asset Preloading & Cache Service for Web Stream Room.
 * Caches luxury and popular gift animation assets (MP4 videos, audio clips) via Cache API or Blob storage.
 * Eliminates download/network latency spikes during high-traffic gift-giving "frenzy" events.
 */

import { api } from './api';

interface CacheTelemetry {
    preloadCount: number;
    hitCount: number;
    missCount: number;
    averageLoadTimeMs: number;
    totalLoadTimeMs: number;
    failures: number;
}

class GiftCacheService {
    private inMemoryCache: Map<string, string> = new Map(); // assetUrl -> blobUrl
    private cacheName = 'stream-gift-assets-v1';
    private telemetry: CacheTelemetry = {
        preloadCount: 0,
        hitCount: 0,
        missCount: 0,
        averageLoadTimeMs: 0,
        totalLoadTimeMs: 0,
        failures: 0
    };

    /**
     * Preloads static popular gift files when entering a live stream room
     */
    public async preloadGifts(urls: string[]): Promise<void> {
        const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
        console.log(`[GiftCacheService] Starting background preload for ${uniqueUrls.length} assets...`);
        
        await Promise.all(uniqueUrls.map(url => {
            return this.preloadAsset(url).catch(err => {
                console.warn(`[GiftCacheService] Background preload failed for ${url}:`, err);
                this.telemetry.failures++;
            });
        }));
        
        console.log(`[GiftCacheService] Preload completed. Current memory cache size: ${this.inMemoryCache.size}`);
    }

    /**
     * Resolves a network URL to its local Blob URL instantly.
     * Falls back to the original network URL if download/caching fails.
     */
    public async getCachedOrFetch(url: string): Promise<string> {
        if (!url) return '';
        
        // MemCache hit
        if (this.inMemoryCache.has(url)) {
            this.telemetry.hitCount++;
            return this.inMemoryCache.get(url)!;
        }

        this.telemetry.missCount++;
        const startTime = performance.now();
        
        try {
            const blobUrl = await this.preloadAsset(url);
            const duration = performance.now() - startTime;
            
            // Record metrics
            this.telemetry.totalLoadTimeMs += duration;
            const loads = this.telemetry.preloadCount;
            this.telemetry.averageLoadTimeMs = loads > 0 ? this.telemetry.totalLoadTimeMs / loads : duration;
            
            return blobUrl;
        } catch (error) {
            console.error(`[GiftCacheService] Failed resolving asset ${url}, falling back to network:`, error);
            this.telemetry.failures++;
            return url; // Non-blocking failure fallback
        }
    }

    /**
     * Performs background fetch and prepares Blob URL + caches in Browser Cache API
     */
    private async preloadAsset(url: string): Promise<string> {
        if (this.inMemoryCache.has(url)) {
            return this.inMemoryCache.get(url)!;
        }

        const startTime = performance.now();

        // 1. Try to fetch from Browser Cache Storage first
        try {
            if ('caches' in window) {
                const cache = await window.caches.open(this.cacheName);
                const cachedResponse = await cache.match(url);
                if (cachedResponse) {
                    const blob = await cachedResponse.blob();
                    const bUrl = URL.createObjectURL(blob);
                    this.inMemoryCache.set(url, bUrl);
                    this.telemetry.preloadCount++;
                    return bUrl;
                }
            }
        } catch (e) {
            console.warn('[GiftCacheService] Cache Storage error:', e);
        }

        // 2. Fetch from network and store via central API service
        const blob = await api.fetchAssetBlob(url);
        const blobUrl = URL.createObjectURL(blob);

        // Put in Browser Cache in background
        if ('caches' in window) {
            try {
                const cache = await window.caches.open(this.cacheName);
                await cache.put(url, new Response(blob));
            } catch (cacheError) {
                console.warn('[GiftCacheService] Failed writing to network cache stream:', cacheError);
            }
        }

        this.inMemoryCache.set(url, blobUrl);
        this.telemetry.preloadCount++;
        
        const duration = performance.now() - startTime;
        console.log(`[GiftCacheService] Asset loaded & cached: ${url.split('/').pop()} in ${duration.toFixed(1)}ms`);
        
        return blobUrl;
    }

    /**
     * Exports current telemetry diagnostics
     */
    public getTelemetry() {
        return { ...this.telemetry, cacheSize: this.inMemoryCache.size };
    }

    /**
     * Clears all memory object URLs to release raw device memory
     */
    public releaseMemory(): void {
        this.inMemoryCache.forEach(blobUrl => {
            try {
                URL.revokeObjectURL(blobUrl);
            } catch (e) {
                // Ignore revocation errors
            }
        });
        this.inMemoryCache.clear();
        console.log('[GiftCacheService] Cache released to free memory.');
    }
}

export const giftCacheService = new GiftCacheService();

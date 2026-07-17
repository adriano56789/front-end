/**
 * Geolocation and Distance utilities for BuzzCast
 */
import { api } from '../services/api';

// Haversine formula to compute distance between two coordinates in km
export function calculateDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distance in km
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

// Format distance following user examples:
// * Próximo de você (< 1 km)
// * X km de distância (>= 1 km)
export function formatDistance(distanceInKm: number | null | undefined): string {
    if (distanceInKm === null || distanceInKm === undefined || isNaN(distanceInKm)) {
        return "desconhecida";
    }
    if (distanceInKm < 1) {
        return "Próximo de você";
    }
    return `${Math.round(distanceInKm)} km de distância`;
}

export interface IPLocationResult {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
    locationName: string;
}

// Fetch approximate location by IP using free ip-api.com (handles fallback automatically)
export async function getApproximateLocationByIP(): Promise<IPLocationResult> {
    try {
        // REMOVIDO: localStorage cache - usar sempre API para dados frescos
        // const cached = localStorage.getItem('buzzcast_ip_location');
        // if (cached) {
        //     try {
        //         return JSON.parse(cached);
        //     } catch (e) {}
        // }

        // Usar a implementação oficial de geolocalização por IP no backend.
        const response = await api.getIPLocation();
        if (response && response.success && response.data) {
            const data = response.data;
            const result: IPLocationResult = {
                latitude: data.lat || -23.5505,
                longitude: data.lon || -46.6333,
                city: data.city || 'São Paulo',
                state: data.region || 'SP',
                country: data.country || 'Brasil',
                locationName: data.city && data.region ? `${data.city}, ${data.region}` : 'São Paulo, SP'
            };
            // REMOVIDO: localStorage.setItem('buzzcast_ip_location', JSON.stringify(result));
            return result;
        }

        console.warn('[LOCATION] /api/location/ip retornou falha. Usando localização padrão de fallback.');
        return {
            latitude: -23.5505,
            longitude: -46.6333,
            city: 'São Paulo',
            state: 'SP',
            country: 'Brasil',
            locationName: 'São Paulo, SP'
        };
    } catch (error) {
        console.warn('IP Geolocation failed, using default São Paulo location', error);
        // Fallback to São Paulo
        return {
            latitude: -23.5505,
            longitude: -46.6333,
            city: 'São Paulo',
            state: 'SP',
            country: 'Brasil',
            locationName: 'São Paulo, SP'
        };
    }
}

// Request precise coordinates from browser Geolocation API
export function getPreciseLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported by browser'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                reject(error);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    });
}

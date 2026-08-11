import { PurchaseCurrency } from '../types';

export const CURRENCY_SYMBOL: Record<PurchaseCurrency, string> = {
    BRL: 'R$',
    EUR: '€',
    USD: 'US$',
};

export const CURRENCY_RATE: Record<PurchaseCurrency, number> = {
    BRL: 1,
    EUR: 0.1613,
    USD: 0.1786,
};

export const convertBRLTo = (brlPrice: number, currency: PurchaseCurrency): number => {
    if (currency === 'BRL') return brlPrice;
    return Math.round(brlPrice * CURRENCY_RATE[currency] * 100) / 100;
};
